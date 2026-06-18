import xml.etree.ElementTree as ET
import re

import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://cloudblog.withgoogle.com/products/data-analytics/rss/"
FALLBACK_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

NS = {
    "atom": "http://www.w3.org/2005/Atom",
}


def clean_html(raw: str) -> str:
    """Strip HTML tags and collapse whitespace for tweet previews."""
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_atom_feed(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)

    # Detect namespace from root tag
    ns_match = re.match(r"\{([^}]+)\}", root.tag)
    ns_uri = ns_match.group(1) if ns_match else "http://www.w3.org/2005/Atom"
    ns = {"atom": ns_uri}

    entries = []
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        summary_el = entry.find("atom:summary", ns)
        content_el = entry.find("atom:content", ns)
        published_el = entry.find("atom:published", ns)
        updated_el = entry.find("atom:updated", ns)
        link_el = entry.find("atom:link[@rel='alternate']", ns)
        if link_el is None:
            link_el = entry.find("atom:link", ns)

        raw_content = (
            (content_el.text if content_el is not None else None)
            or (summary_el.text if summary_el is not None else None)
            or ""
        )

        title = title_el.text if title_el is not None else "Untitled"
        published = (
            published_el.text
            if published_el is not None
            else (updated_el.text if updated_el is not None else "")
        )
        link = link_el.get("href") if link_el is not None else "#"

        entries.append(
            {
                "title": title,
                "content_html": raw_content,
                "summary": clean_html(raw_content)[:280],
                "published": published,
                "link": link,
            }
        )

    return entries


def parse_rss_feed(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    channel = root.find("channel")
    if channel is None:
        return []

    entries = []
    for item in channel.findall("item"):
        title_el = item.find("title")
        description_el = item.find("description")
        pub_date_el = item.find("pubDate")
        link_el = item.find("link")

        raw_content = description_el.text if description_el is not None else ""

        title = title_el.text if title_el is not None else "Untitled"
        published = pub_date_el.text if pub_date_el is not None else ""
        link = link_el.text if link_el is not None else "#"

        entries.append(
            {
                "title": title,
                "content_html": raw_content,
                "summary": clean_html(raw_content)[:280],
                "published": published,
                "link": link,
            }
        )

    return entries


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes")
def release_notes():
    errors = []
    for url in [FALLBACK_URL, FEED_URL]:
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            xml_text = resp.text

            # Try Atom first, then RSS
            if "<feed" in xml_text or "Atom" in xml_text:
                entries = parse_atom_feed(xml_text)
            else:
                entries = parse_rss_feed(xml_text)

            if entries:
                return jsonify({"entries": entries, "source": url})
        except Exception as exc:
            errors.append(f"{url}: {exc}")
            continue

    return jsonify({"error": "; ".join(errors), "entries": []}), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
