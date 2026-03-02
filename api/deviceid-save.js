export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const key = req.headers["x-admin-key"];
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing token" });

    const { mode = "append", entryText = "" } = req.body || {};
    const incoming = String(entryText || "").replace(/\r/g, "").trim();
    if (!incoming) return res.status(400).json({ error: "Missing entryText" });

    // Target repo/file (your data repo)
    const owner = "PRENDLYMADAPAKER";
    const repo = "Device-ID";
    const branch = "main";
    const path = "Device ID"; // file name has space

    const safePath = encodeURIComponent(path);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    const normalizeBlocks = (text) => {
      const t = String(text || "").replace(/\r/g, "");
      // trim only the ends, keep internal spaces
      const trimmed = t.replace(/\s+$/g, "").replace(/^\s+/g, "");
      // collapse 3+ newlines to exactly 2 (one blank line between blocks)
      const collapsed = trimmed.replace(/\n{3,}/g, "\n\n");
      return collapsed ? (collapsed + "\n") : "";
    };

    const ensureEndsWithBlankLine = (text) => {
      let t = String(text || "").replace(/\r/g, "");
      if (!t.trim()) return "";
      // normalize end: exactly two newlines
      t = t.replace(/\n*$/g, "\n\n");
      return t;
    };

    // Get current file to get sha + content
    const getResp = await fetch(`${url}?ref=${branch}`, { headers });
    if (!getResp.ok) {
      const err = await getResp.text();
      return res.status(getResp.status).send(err);
    }

    const fileData = await getResp.json();
    const sha = fileData.sha;
    const currentContent = Buffer.from(fileData.content || "", "base64").toString("utf8");

    let updatedContent = currentContent;

    if (mode === "append") {
      updatedContent = ensureEndsWithBlankLine(updatedContent);
      updatedContent += normalizeBlocks(incoming);
      // ensure one blank line after the appended block
      updatedContent = ensureEndsWithBlankLine(updatedContent);
    } else if (mode === "replace") {
      updatedContent = normalizeBlocks(incoming);
    } else {
      return res.status(400).json({ error: "Invalid mode. Use append or replace." });
    }

    const body = {
      message: mode === "replace" ? "Replace Device ID file via admin" : "Append subscriber via admin",
      content: Buffer.from(updatedContent, "utf8").toString("base64"),
      branch,
      sha,
    };

    const putResp = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await putResp.text();
    if (!putResp.ok) return res.status(putResp.status).send(result);

    return res.status(200).send(result);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
      }
      
