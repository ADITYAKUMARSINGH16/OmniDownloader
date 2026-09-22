import asyncio
import os
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass


@dataclass
class MediaInfo:
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    bitrate: Optional[int] = None
    format: Optional[str] = None
    size: Optional[int] = None


class FFmpegService:
    def __init__(self, ffmpeg_path: str = "ffmpeg", ffprobe_path: str = "ffprobe"):
        self.ffmpeg_path = ffmpeg_path
        self.ffprobe_path = ffprobe_path
    
    async def get_media_info(self, file_path: str) -> MediaInfo:
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            if proc.returncode != 0:
                return MediaInfo()
            
            import json
            data = json.loads(stdout.decode())
            
            info = MediaInfo()
            
            if "format" in data:
                fmt = data["format"]
                info.duration = float(fmt.get("duration", 0)) if fmt.get("duration") else None
                info.bitrate = int(fmt.get("bit_rate", 0)) if fmt.get("bit_rate") else None
                info.format = fmt.get("format_name")
                info.size = int(fmt.get("size", 0)) if fmt.get("size") else None
            
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    info.width = stream.get("width")
                    info.height = stream.get("height")
                    info.video_codec = stream.get("codec_name")
                elif stream.get("codec_type") == "audio":
                    info.audio_codec = stream.get("codec_name")
            
            return info
        except Exception:
            return MediaInfo()
    
    async def merge_video_audio(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        video_codec: str = "copy",
        audio_codec: str = "copy",
    ) -> bool:
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", video_codec,
            "-c:a", audio_codec,
            "-map", "0:v:0",
            "-map", "1:a:0",
            output_path
        ]
        
        return await self._run_ffmpeg(cmd)
    
    async def convert_format(
        self,
        input_path: str,
        output_path: str,
        video_codec: str = "libx264",
        audio_codec: str = "aac",
        quality: str = "23",
    ) -> bool:
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", input_path,
            "-c:v", video_codec,
            "-crf", quality,
            "-c:a", audio_codec,
            "-b:a", "128k",
            output_path
        ]
        
        return await self._run_ffmpeg(cmd)
    
    async def extract_audio(
        self,
        input_path: str,
        output_path: str,
        audio_codec: str = "libmp3lame",
        bitrate: str = "192k",
    ) -> bool:
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", input_path,
            "-vn",
            "-c:a", audio_codec,
            "-b:a", bitrate,
            output_path
        ]
        
        return await self._run_ffmpeg(cmd)
    
    async def embed_thumbnail(
        self,
        video_path: str,
        thumbnail_path: str,
        output_path: str,
    ) -> bool:
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", video_path,
            "-i", thumbnail_path,
            "-map", "0",
            "-map", "1",
            "-c", "copy",
            "-disposition:v:1", "attached_pic",
            output_path
        ]
        
        return await self._run_ffmpeg(cmd)
    
    async def extract_frames(
        self,
        input_path: str,
        output_dir: str,
        count: int = 10,
    ) -> List[str]:
        os.makedirs(output_dir, exist_ok=True)
        output_pattern = os.path.join(output_dir, "frame_%04d.jpg")
        
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", input_path,
            "-vf", f"select=not(mod(n\\,{int(100/count)})),scale=320:-1",
            "-vsync", "vfr",
            "-frames:v", str(count),
            output_pattern
        ]
        
        success = await self._run_ffmpeg(cmd)
        if success:
            return sorted([os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.endswith(".jpg")])
        return []
    
    async def create_thumbnail(
        self,
        input_path: str,
        output_path: str,
        timestamp: str = "00:00:01",
    ) -> bool:
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-ss", timestamp,
            "-i", input_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path
        ]
        
        return await self._run_ffmpeg(cmd)
    
    async def _run_ffmpeg(self, cmd: List[str]) -> bool:
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            return proc.returncode == 0
        except Exception:
            return False


async def check_ffmpeg_available(ffmpeg_path: str = "ffmpeg", ffprobe_path: str = "ffprobe") -> bool:
    try:
        proc = await asyncio.create_subprocess_exec(
            ffmpeg_path, "-version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        
        proc = await asyncio.create_subprocess_exec(
            ffprobe_path, "-version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
        
        return True
    except Exception:
        return False


ffmpeg_service = FFmpegService()