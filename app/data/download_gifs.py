import json
import sys
import urllib.error
import urllib.request
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
WORKOUTS_JSON = BASE_DIR / "workouts.json"
OUTPUT_DIR = BASE_DIR / "gif"
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    ),
    "Referer": "https://exercisedb.dev/",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}


def load_gif_urls(json_path: Path) -> list[str]:
    with json_path.open("r", encoding="utf-8") as file:
        workouts = json.load(file)

    urls = []
    for item in workouts:
        gif_url = item.get("gifUrl")
        if isinstance(gif_url, str) and gif_url.lower().endswith(".gif"):
            urls.append(gif_url)
    return urls


def download_file(url: str, destination: Path) -> bool:
    try:
        request = urllib.request.Request(url, headers=REQUEST_HEADERS)
        with urllib.request.urlopen(request) as response, destination.open("wb") as file:
            file.write(response.read())
        return True
    except urllib.error.URLError as error:
        print(f"Failed: {url} -> {error}", file=sys.stderr)
        return False


def main() -> int:
    if not WORKOUTS_JSON.exists():
        print(f"Missing file: {WORKOUTS_JSON}", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(exist_ok=True)
    urls = load_gif_urls(WORKOUTS_JSON)

    total = len(urls)
    downloaded = 0
    skipped = 0
    failed = 0

    for index, url in enumerate(urls, start=1):
        filename = url.rsplit("/", 1)[-1]
        destination = OUTPUT_DIR / filename

        if destination.exists():
            skipped += 1
            print(f"[{index}/{total}] Skipped {filename}")
            continue

        if download_file(url, destination):
            downloaded += 1
            print(f"[{index}/{total}] Downloaded {filename}")
        else:
            failed += 1

    print(
        f"Done. total={total} downloaded={downloaded} skipped={skipped} failed={failed}"
    )
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
