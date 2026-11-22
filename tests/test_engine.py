import pytest
from download.engine import DownloadEngine, ProgressCallback
from models.schemas import FormatModel, ContentType
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio


class TestProgressCallback:
    def test_initialization(self):
        callback = ProgressCallback("test_id")
        assert callback.download_id == "test_id"
        assert callback.callback is None
    
    def test_with_callback(self):
        async def test_callback(download_id, progress, downloaded, total, speed, eta):
            pass
        
        callback = ProgressCallback("test_id", test_callback)
        assert callback.callback == test_callback


class TestDownloadEngine:
    def setup_method(self):
        self.engine = DownloadEngine()
    
    def test_initialization(self):
        assert self.engine.active_downloads == {}
        assert self.engine.progress_callbacks == {}
    
    @pytest.mark.asyncio
    async def test_start_download_creates_task(self):
        with patch('download.engine.DownloadEngine._download_task', new_callable=AsyncMock) as mock_task:
            mock_task.return_value = None
            
            format_model = FormatModel(
                format_id="test",
                quality="720p",
                extension="mp4",
                filesize=1000000,
            )
            
            download_id = await self.engine.start_download(
                "test_download",
                "https://example.com/video.mp4",
                format_model,
            )
            
            assert download_id == "test_download"
            assert download_id in self.engine.active_downloads
            assert download_id in self.engine.progress_callbacks
    
    @pytest.mark.asyncio
    async def test_pause_download(self):
        mock_task = AsyncMock()
        self.engine.active_downloads["test_id"] = mock_task
        
        await self.engine.pause_download("test_id")
        
        mock_task.cancel.assert_called_once()
        assert "test_id" not in self.engine.active_downloads
    
    @pytest.mark.asyncio
    async def test_cancel_download(self):
        mock_task = AsyncMock()
        self.engine.active_downloads["test_id"] = mock_task
        
        with patch('download.engine.get_scoped_session') as mock_session:
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            mock_session.return_value.__aenter__.return_value = mock_db
            
            await self.engine.cancel_download("test_id")
            
            mock_task.cancel.assert_called_once()
            assert "test_id" not in self.engine.active_downloads

    @pytest.mark.asyncio
    async def test_download_hls_includes_custom_headers(self, tmp_path):
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_proc = AsyncMock()
            mock_proc.returncode = 0
            mock_proc.stdout.readline = AsyncMock(return_value=b"")
            mock_proc.stderr.readline = AsyncMock(return_value=b"")
            mock_proc.wait = AsyncMock(return_value=None)
            mock_exec.return_value = mock_proc

            extra_meta = {
                "headers": {
                    "Referer": "https://stream.example.com/",
                    "User-Agent": "StreamSniffer/1.0",
                }
            }

            with patch("download.engine.get_scoped_session") as mock_session:
                mock_db = AsyncMock()
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                mock_db.execute.return_value = mock_result
                mock_session.return_value.__aenter__.return_value = mock_db

                await self.engine._download_hls(
                    "hls_test_id",
                    "https://stream.example.com/playlist.m3u8",
                    str(tmp_path),
                    extra_meta=extra_meta,
                )

                mock_exec.assert_called_once()
                cmd = mock_exec.call_args[0]
                assert "-headers" in cmd
                headers_idx = cmd.index("-headers")
                assert "Referer: https://stream.example.com/\r\n" in cmd[headers_idx + 1]
                assert "User-Agent: StreamSniffer/1.0\r\n" in cmd[headers_idx + 1]

    @pytest.mark.asyncio
    async def test_update_db_progress_monotonic(self):
        with patch("download.engine.get_scoped_session") as mock_session:
            mock_db = AsyncMock()
            mock_dl = MagicMock()
            mock_dl.downloaded_size = 1000
            mock_dl.file_size = 5000
            mock_dl.progress = 20
            mock_dl.speed = 100
            mock_dl.eta = 40

            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_dl
            mock_db.execute.return_value = mock_result
            mock_session.return_value.__aenter__.return_value = mock_db

            # Normal forward progression
            await self.engine._update_db_progress(
                "test_dl",
                progress=50.0,
                downloaded_size=2500,
                file_size=5500,
                speed=500,
                eta=6,
            )
            assert mock_dl.downloaded_size == 2500
            assert mock_dl.file_size == 5500
            assert mock_dl.progress == 50
            assert mock_dl.speed == 500
            assert mock_dl.eta == 6

            # Regression attempt: downloaded_size drops to 500 and file_size drops to 2000
            await self.engine._update_db_progress(
                "test_dl",
                progress=55.0,
                downloaded_size=500,
                file_size=2000,
                speed=300,
                eta=5,
            )
            # Both downloaded_size and file_size must remain monotonically preserved
            assert mock_dl.downloaded_size == 2500
            assert mock_dl.file_size == 5500

    @pytest.mark.asyncio
    async def test_multistream_ytdlp_hooks(self, tmp_path):
        broadcasted_messages = []
        progress_calls = []

        class FakeWsManager:
            async def send_progress(self, dl_id, msg):
                progress_calls.append(msg)
            async def broadcast(self, msg):
                broadcasted_messages.append(msg)

        captured_opts = {}

        class FakeYoutubeDL:
            def __init__(self, opts):
                captured_opts.update(opts)
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def extract_info(self, url, download=True):
                # Trigger progress hooks for Video stream (Stream 1)
                ph = captured_opts["progress_hooks"][0]
                pp = captured_opts["postprocessor_hooks"][0]

                # Stream 1 downloading
                ph({
                    "status": "downloading",
                    "info_dict": {"format_id": "137"},
                    "downloaded_bytes": 100_000_000,
                    "total_bytes": 200_000_000,
                    "speed": 1000,
                    "eta": 100,
                })
                # Stream 1 finished
                ph({
                    "status": "finished",
                    "info_dict": {"format_id": "137"},
                    "downloaded_bytes": 200_000_000,
                    "total_bytes": 200_000_000,
                })

                # Stream 2 downloading (audio stream - resets raw downloaded_bytes to 10MB)
                ph({
                    "status": "downloading",
                    "info_dict": {"format_id": "140"},
                    "downloaded_bytes": 10_000_000,
                    "total_bytes": 40_000_000,
                    "speed": 500,
                    "eta": 60,
                })

                # Postprocessor hook (FFmpeg muxing)
                pp({"status": "started"})

                return {
                    "id": "vid123",
                    "title": "Test Title",
                    "_filename": str(tmp_path / "test.mp4"),
                    "thumbnail": "https://example.com/thumb.jpg",
                }

        # Create dummy file on disk for os.path.getsize
        test_file = tmp_path / "test.mp4"
        test_file.write_bytes(b"0" * 1024)

        format_model = FormatModel(
            format_id="137",
            quality="1080p",
            extension="mp4",
            filesize=240_000_000,
            is_video=True,
            is_audio=False,
        )

        with patch("download.engine._get_ws_manager", return_value=FakeWsManager()), \
             patch("download.engine.get_scoped_session") as mock_session, \
             patch("yt_dlp.YoutubeDL", FakeYoutubeDL):

            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            mock_session.return_value.__aenter__.return_value = mock_db

            # Register download in active_downloads so cancellation check passes
            self.engine.active_downloads["dl_multi"] = MagicMock()

            await self.engine._download_ytdlp(
                "dl_multi",
                "https://example.com/watch?v=123",
                format_model=format_model,
                target_dir=str(tmp_path),
            )

        # Verify that Stream 2 accumulated downloaded_size (200MB + 10MB = 210MB), not 10MB!
        stream2_msg = next(m for m in progress_calls if m.get("progress") and 85.0 < m["progress"] < 99.0)
        assert stream2_msg["downloaded"] == 210_000_000
        assert stream2_msg["downloaded_size"] == 210_000_000
        assert stream2_msg["file_size"] == 240_000_000
        # Stream 2 is 10/40 = 25% through audio (85 + 25 * 0.12 = 88.0%)
        assert stream2_msg["progress"] == 88.0

        # Verify postprocessor message sent 99% with speed 0 and eta 0
        post_msg = next(m for m in progress_calls if m["progress"] == 99.0)
        assert post_msg["speed"] == 0
        assert post_msg["eta"] == 0
        assert post_msg["downloaded_size"] == 210_000_000

    def test_parse_time_str(self):
        from download.engine import parse_time_str
        assert parse_time_str(None) is None
        assert parse_time_str("") is None
        assert parse_time_str("   ") is None
        assert parse_time_str(42) == 42.0
        assert parse_time_str("90") == 90.0
        assert parse_time_str("01:30") == 90.0
        assert parse_time_str("00:01:30") == 90.0
        assert parse_time_str("01:02:03") == 3723.0
        assert parse_time_str("invalid") is None
        assert parse_time_str("-10") is None

    @pytest.mark.asyncio
    async def test_clipping_and_enhancements_options(self, tmp_path):
        captured_opts = {}

        class CapturingYoutubeDL:
            def __init__(self, opts):
                captured_opts.update(opts)
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def extract_info(self, url, download=True):
                return {
                    "id": "clip123",
                    "title": "Clip Title",
                    "_filename": str(tmp_path / "clip.mp4"),
                }

        test_file = tmp_path / "clip.mp4"
        test_file.write_bytes(b"test")

        format_model = FormatModel(
            format_id="137",
            quality="1080p",
            extension="mp4",
            is_video=True,
            is_audio=False,
        )

        with patch("download.engine._get_ws_manager"), \
             patch("download.engine.get_scoped_session") as mock_session, \
             patch("yt_dlp.YoutubeDL", CapturingYoutubeDL):

            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            mock_session.return_value.__aenter__.return_value = mock_db
            self.engine.active_downloads["dl_clip"] = MagicMock()

            await self.engine._download_ytdlp(
                "dl_clip",
                "https://example.com/watch?v=123",
                format_model=format_model,
                target_dir=str(tmp_path),
                extra_meta={
                    "start_time": "00:10",
                    "end_time": "01:00",
                    "subtitle_langs": ["en", "es"],
                    "embed_subtitles": True,
                    "embed_chapters": True,
                    "sponsorblock_remove": True,
                },
            )

        assert "download_ranges" in captured_opts
        assert captured_opts.get("force_keyframes_at_cuts") is True
        assert captured_opts.get("writesubtitles") is True
        assert captured_opts.get("subtitleslangs") == ["en", "es"]
        assert captured_opts.get("add_chapters") is True
        assert captured_opts.get("sponsorblock_remove") == ["sponsor", "selfpromo", "interaction"]
        assert "_clip_10-60" in captured_opts.get("outtmpl", "")
        # Subtitles postprocessor attached
        assert any(p.get("key") == "FFmpegEmbedSubtitle" for p in captured_opts.get("postprocessors", []))