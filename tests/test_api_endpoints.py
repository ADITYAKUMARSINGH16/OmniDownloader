import os
import sys
import tempfile
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from core.database import get_db
from models.database import Download
from models.schemas import PlaylistAnalyzeResponse, PlaylistEntryModel

client = TestClient(app)


class TestApiUpgrades:
    def test_analyze_playlist_ssrf_blocking(self):
        """Ensure SSRF protection blocks local / private IP playlist analysis."""
        resp = client.post("/api/analyze-playlist", json={"url": "http://127.0.0.1:8000/playlist"})
        assert resp.status_code == 400
        data = resp.json()
        detail_str = str(data.get("detail", "")).lower()
        assert "private" in detail_str or "blocked" in detail_str

    @patch("extractors.base.BaseExtractor.extract_playlist")
    def test_analyze_playlist_success(self, mock_extract):
        """Test successful playlist analysis returning entries."""
        mock_extract.return_value = PlaylistAnalyzeResponse(
            id="PL12345",
            title="Cybernetic Mix",
            uploader="DJ Neon",
            entry_count=2,
            entries=[
                PlaylistEntryModel(id="v1", url="https://youtube.com/watch?v=v1", title="Track 1", duration=180, thumbnail=None, index=1),
                PlaylistEntryModel(id="v2", url="https://youtube.com/watch?v=v2", title="Track 2", duration=210, thumbnail=None, index=2),
            ]
        )

        resp = client.post("/api/analyze-playlist", json={"url": "https://www.youtube.com/playlist?list=PL12345"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "PL12345"
        assert data["title"] == "Cybernetic Mix"
        assert data["entry_count"] == 2
        assert len(data["entries"]) == 2
        assert data["entries"][0]["title"] == "Track 1"

    @pytest.mark.asyncio
    async def test_stream_nonexistent_download_404(self, db_session):
        """Ensure streaming a missing download returns 404."""
        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = client.get("/api/download/nonexistent-uuid/stream")
            assert resp.status_code == 404
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_probe_nonexistent_download_404(self, db_session):
        """Ensure probing a missing download returns 404."""
        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = client.get("/api/download/nonexistent-uuid/probe")
            assert resp.status_code == 404
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_stream_http_range_requests(self, db_session):
        """Verify HTTP 206 Partial Content range requests for media streaming."""
        sample_data = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as f:
            f.write(sample_data)
            temp_path = f.name

        try:
            dl = Download(
                id="test-stream-dl",
                url="https://youtube.com/watch?v=sample",
                source="youtube",
                title="Range Test Stream",
                status="completed",
                output_path=temp_path,
                file_size=len(sample_data),
            )
            db_session.add(dl)
            await db_session.commit()

            async def override_get_db():
                yield db_session

            app.dependency_overrides[get_db] = override_get_db

            # 1. Full request (no Range) -> 200 OK
            resp_full = client.get("/api/download/test-stream-dl/stream")
            assert resp_full.status_code == 200
            assert resp_full.content == sample_data
            assert resp_full.headers["Accept-Ranges"] == "bytes"

            # 2. Byte Range request 0-9 -> 206 Partial Content
            resp_range = client.get("/api/download/test-stream-dl/stream", headers={"Range": "bytes=0-9"})
            assert resp_range.status_code == 206
            assert resp_range.content == sample_data[0:10]
            assert resp_range.headers["Content-Range"] == f"bytes 0-9/{len(sample_data)}"
            assert resp_range.headers["Content-Length"] == "10"

            # 3. Open-ended Byte Range request 10- -> 206 Partial Content
            resp_open = client.get("/api/download/test-stream-dl/stream", headers={"Range": "bytes=10-"})
            assert resp_open.status_code == 206
            assert resp_open.content == sample_data[10:]
            assert resp_open.headers["Content-Range"] == f"bytes 10-{len(sample_data)-1}/{len(sample_data)}"

            app.dependency_overrides.clear()
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @pytest.mark.asyncio
    async def test_queue_handles_fractional_file_size_float(self, db_session):
        """Ensure GET /api/queue coerces float file_size (e.g. 656637150.5) to int without 500 error."""
        from datetime import datetime, timezone
        from models.database import DownloadStatus as DBDownloadStatus

        dl = Download(
            id="test-float-dl-1",
            url="https://youtube.com/watch?v=sample",
            source="youtube",
            title="Sample Video",
            file_size=656637150.5,  # Fractional float from yt-dlp estimate
            downloaded_size=328318575.25,
            progress=50,
            status=DBDownloadStatus.DOWNLOADING,
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(dl)
        await db_session.commit()

        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = client.get("/api/queue")
            assert resp.status_code == 200
            data = resp.json()
            assert "downloads" in data
            found = next((d for d in data["downloads"] if d["id"] == "test-float-dl-1"), None)
            assert found is not None
            assert isinstance(found["file_size"], int)
            assert found["file_size"] in (656637150, 656637151)
            assert isinstance(found["downloaded_size"], int)
            assert found["downloaded_size"] == 328318575
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_queue_retry_and_clear_failed(self, db_session):
        """Verify bulk retry and bulk clear of failed downloads."""
        from datetime import datetime, timezone
        from models.database import DownloadStatus as DBDownloadStatus

        # Add failed download record
        dl_failed = Download(
            id="test-failed-1",
            url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            source="youtube",
            status=DBDownloadStatus.FAILED,
            error="ffprobe and ffmpeg not found",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(dl_failed)
        await db_session.commit()

        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db
        try:
            # 1. Retry failed
            resp = client.post("/api/queue/retry-failed")
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["retried"] >= 1

            # Mark failed again to test clear
            dl_failed.status = DBDownloadStatus.FAILED
            await db_session.commit()

            # 2. Clear failed
            clear_resp = client.post("/api/queue/clear-failed")
            assert clear_resp.status_code == 200
            clear_data = clear_resp.json()
            assert clear_data["success"] is True
            assert clear_data["cleared"] >= 1

            # 3. Add item and test DELETE /queue
            dl_queued = Download(
                id="test-queued-wipe",
                url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                source="youtube",
                status=DBDownloadStatus.QUEUED,
                created_at=datetime.now(timezone.utc),
            )
            db_session.add(dl_queued)
            await db_session.commit()

            q_del_resp = client.delete("/api/queue")
            assert q_del_resp.status_code == 200
            assert q_del_resp.json()["success"] is True

            # 4. Test POST /system/reset-data
            reset_resp = client.post("/api/system/reset-data")
            assert reset_resp.status_code == 200
            assert reset_resp.json()["success"] is True
        finally:
            app.dependency_overrides.clear()
