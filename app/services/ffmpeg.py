from __future__ import annotations

import re
import shlex
import subprocess
from collections.abc import Callable
from pathlib import Path

_ASPECT_FILTERS = {
    "9:16": (
        "scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
    ),
    "1:1": (
        "scale=1080:1080:force_original_aspect_ratio=decrease,"
        "pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
    ),
    "16:9": (
        "scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
    ),
}


class FFmpegError(RuntimeError):
    pass


def probe_duration(path: str) -> float | None:
    """Return duration in seconds via ffprobe, or None on failure."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    try:
        out = subprocess.check_output(cmd, text=True).strip()
        return float(out) if out else None
    except (subprocess.CalledProcessError, ValueError):
        return None


_TIME_RE = re.compile(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)")


def _parse_time(line: str) -> float | None:
    m = _TIME_RE.search(line)
    if not m:
        return None
    h, mm, ss = m.groups()
    return int(h) * 3600 + int(mm) * 60 + float(ss)


def convert(
    input_path: str,
    output_path: str,
    aspect: str = "9:16",
    start: float | None = None,
    end: float | None = None,
    progress_cb: Callable[[int], None] | None = None,
) -> str:
    """Convert video to target aspect ratio with optional trim. Returns output_path."""
    vf = _ASPECT_FILTERS.get(aspect)
    if vf is None:
        raise FFmpegError(f"Unsupported aspect: {aspect}")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    total = probe_duration(input_path)
    if start is not None and end is not None and end > start:
        total = end - start
    elif start is not None and total is not None:
        total = max(total - start, 0)

    cmd: list[str] = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "info"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", input_path]
    if end is not None:
        if start is not None:
            cmd += ["-t", f"{max(end - start, 0):.3f}"]
        else:
            cmd += ["-to", f"{end:.3f}"]
    cmd += [
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-progress",
        "pipe:1",
        "-nostats",
        output_path,
    ]

    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
    )

    last_pct = -1
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            if progress_cb and total:
                t = _parse_time(line)
                if t is None and line.startswith("out_time_ms="):
                    try:
                        t = int(line.split("=", 1)[1].strip()) / 1_000_000
                    except ValueError:
                        t = None
                if t is not None:
                    pct = min(int(t / total * 100), 99)
                    if pct != last_pct:
                        progress_cb(pct)
                        last_pct = pct
    finally:
        rc = proc.wait()

    if rc != 0:
        raise FFmpegError(f"ffmpeg exited with code {rc}: {shlex.join(cmd)}")

    if progress_cb:
        progress_cb(100)
    return output_path
