export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const key = req.headers["x-admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing token" });

    const { entryText } = req.body;

    if (!entryText) return res.status(400).json({ error: "Missing entryText" });

    const owner = "PRENDLYMADAPAKER";
    const repo = "Device-ID";
    const branch = "main";
    const path = "Device ID";

    const safePath = encodeURIComponent(path);
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json"
    };

    // Get current file
    const getResp = await fetch(`${baseUrl}?ref=${branch}`, { headers });

    if (!getResp.ok) {
      const err = await getResp.text();
      return res.status(getResp.status).send(err);
    }

    const fileData = await getResp.json();
    const sha = fileData.sha;

    const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");

    let updatedContent = currentContent;
    if (!updatedContent.endsWith("\n")) updatedContent += "\n";
    updatedContent += entryText + "\n";

    const body = {
      message: "Add subscriber via admin panel",
      content: Buffer.from(updatedContent).toString("base64"),
      branch,
      sha
    };

    const putResp = await fetch(baseUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const result = await putResp.text();

    if (!putResp.ok) return res.status(putResp.status).send(result);

    return res.status(200).send(result);

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
  }
