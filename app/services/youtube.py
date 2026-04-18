from __future__ import annotations

from typing import Any

import yt_dlp

from app.schemas import VideoInfo


class YoutubeError(Exception):
    pass


_BASE_OPTS: dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
}


def fetch_info(url: str) -> VideoInfo:
    """Extract metadata only (no download) via yt-dlp."""
    try:
        with yt_dlp.YoutubeDL(_BASE_OPTS) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        raise YoutubeError(str(e)) from e

    if info is None:
        raise YoutubeError("No info returned")

    if "entries" in info and info["entries"]:
        info = info["entries"][0]

    return VideoInfo(
        id=str(info.get("id", "")),
        title=info.get("title", ""),
        duration=info.get("duration"),
        thumbnail=info.get("thumbnail"),
        uploader=info.get("uploader") or info.get("channel"),
        view_count=info.get("view_count"),
        description=info.get("description"),
    )


def download(url: str, output_template: str, progress_hook=None) -> str:
    """Download the video to disk. Returns the resulting file path."""
    opts: dict[str, Any] = {
        **_BASE_OPTS,
        "skip_download": False,
        "outtmpl": output_template,
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "merge_output_format": "mp4",
    }
    if progress_hook is not None:
        opts["progress_hooks"] = [progress_hook]

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        raise YoutubeError(str(e)) from e

    if info is None:
        raise YoutubeError("Download failed")

    if "entries" in info and info["entries"]:
        info = info["entries"][0]

    filepath = info.get("requested_downloads", [{}])[0].get("filepath")
    if not filepath:
        filepath = yt_dlp.YoutubeDL(opts).prepare_filename(info)
    return filepath
