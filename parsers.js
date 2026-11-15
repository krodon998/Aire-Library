function baseName(name) {
  return name.replace(/\.[^.]+$/, "").trim() || "未命名";
}

function decodeBuffer(buffer) {
  const encodings = ["utf-8", "gb18030", "big5"];
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: encoding === "utf-8" });
      const text = decoder.decode(buffer);
      if (text && !text.includes("\uFFFD")) return text;
    } catch {}
  }
  return new TextDecoder("utf-8").decode(buffer);
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function detectChapters(text) {
  const lines = text.split("\n");
  const chapters = [];
  let offset = 0;
  const patterns = [
    /^\s*第[一二三四五六七八九十百千万〇零两\d]{1,12}[章节卷部回]\s*[^\n]{0,60}$/u,
    /^\s*(?:chapter|book|part)\s+[\divxlc]+\b.*$/i,
    /^\s*#{1,3}\s+\S.+$/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length <= 90 && patterns.some((pattern) => pattern.test(trimmed))) {
      chapters.push({
        id: crypto.randomUUID(),
        title: trimmed.replace(/^#{1,3}\s+/, ""),
        offset,
      });
    }
    offset += line.length + 1;
  }

  if (!chapters.length) {
    chapters.push({ id: crypto.randomUUID(), title: "正文", offset: 0 });
  }
  return chapters;
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((node) => node.remove());
  const blocks = doc.querySelectorAll("p,h1,h2,h3,h4,h5,h6,blockquote,li,pre,br");
  if (blocks.length) {
    return Array.from(blocks)
      .map((node) => node.tagName === "BR" ? "" : (node.textContent || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }
  return doc.body?.textContent || "";
}

async function parseEpub(file) {
  if (!window.JSZip) throw new Error("EPUB 解析器没有加载成功。");
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const containerText = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerText) throw new Error("EPUB 缺少 container.xml。");

  const container = new DOMParser().parseFromString(containerText, "application/xml");
  const rootfile = container.querySelector("rootfile")?.getAttribute("full-path");
  if (!rootfile) throw new Error("EPUB 没找到 OPF。");

  const opfText = await zip.file(rootfile)?.async("string");
  if (!opfText) throw new Error("EPUB OPF 无法读取。");
  const opf = new DOMParser().parseFromString(opfText, "application/xml");
  const title = opf.querySelector("title")?.textContent?.trim() || baseName(file.name);
  const author = opf.querySelector("creator")?.textContent?.trim() || "";
  const manifest = new Map(
    Array.from(opf.querySelectorAll("manifest item")).map((item) => [
      item.getAttribute("id"),
      {
        href: item.getAttribute("href"),
        mediaType: item.getAttribute("media-type"),
      },
    ])
  );
  const spineIds = Array.from(opf.querySelectorAll("spine itemref"))
    .map((item) => item.getAttribute("idref"))
    .filter(Boolean);

  const opfDir = rootfile.includes("/") ? rootfile.slice(0, rootfile.lastIndexOf("/") + 1) : "";
  const parts = [];
  const chapters = [];
  let offset = 0;

  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item?.href) continue;
    const path = new URL(item.href, "https://epub.local/" + opfDir).pathname.slice(1);
    const html = await zip.file(path)?.async("string");
    if (!html) continue;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const heading = doc.querySelector("h1,h2,h3")?.textContent?.trim();
    const text = cleanText(htmlToText(html));
    if (!text) continue;
    chapters.push({ id: crypto.randomUUID(), title: heading || `章节 ${chapters.length + 1}`, offset });
    parts.push(text);
    offset += text.length + 3;
  }

  const content = cleanText(parts.join("\n\n\n"));
  return { title, author, content, chapters: chapters.length ? chapters : detectChapters(content) };
}

async function parsePdf(file) {
  const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const parts = [];
  const chapters = [];
  let offset = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
    chapters.push({ id: crypto.randomUUID(), title: `第 ${pageNumber} 页`, offset });
    parts.push(text);
    offset += text.length + 2;
  }

  const meta = await pdf.getMetadata().catch(() => ({}));
  const title = meta?.info?.Title?.trim?.() || baseName(file.name);
  const author = meta?.info?.Author?.trim?.() || "";
  return { title, author, content: cleanText(parts.join("\n\n")), chapters };
}

export async function parseBookFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  let parsed;

  if (ext === "txt" || ext === "md" || ext === "markdown") {
    const content = cleanText(decodeBuffer(await file.arrayBuffer()));
    parsed = {
      title: baseName(file.name),
      author: "",
      content,
      chapters: detectChapters(content),
    };
  } else if (ext === "epub") {
    parsed = await parseEpub(file);
  } else if (ext === "pdf") {
    parsed = await parsePdf(file);
  } else {
    throw new Error(`暂不支持 .${ext || "?"} 文件。`);
  }

  if (!parsed.content) throw new Error("没有解析到可阅读正文。");

  return {
    id: crypto.randomUUID(),
    title: parsed.title,
    author: parsed.author,
    description: "",
    format: ext,
    size: file.size,
    content: parsed.content,
    chapters: parsed.chapters,
    originalFile: file,
    importedAt: new Date().toISOString(),
    lastReadAt: null,
    progressOffset: 0,
    folderId: null,
    source: "upload",
    story: "",
  };
}
