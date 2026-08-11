import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || "");

  if (!match) {
    throw new Error("Ungültiges Bildformat.");
  }

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST ist erlaubt.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY fehlt in Vercel.",
    });
  }

  try {
    const {
      childImage,
      styleReference,
      name,
      style,
      model,
      color,
    } = req.body || {};

    if (!childImage || !styleReference || !name || !style || !color) {
      return res.status(400).json({
        error: "Foto, Design, Name oder Farbe fehlt.",
      });
    }

    const child = parseDataUrl(childImage);
    const reference = parseDataUrl(styleReference);

    const images = [
      await toFile(
        child.buffer,
        "child.jpg",
        { type: child.mime }
      ),
      await toFile(
        reference.buffer,
        "style-reference.jpg",
        { type: reference.mime }
      ),
    ];

    const prompt = `
Create a polished, photorealistic commercial KIDZ STYLE T-shirt mockup.

The FIRST uploaded image is the identity reference of the child.
The SECOND uploaded image is only the visual style and design reference.

IMPORTANT IDENTITY RULES:
- Preserve the child's recognizable face.
- Preserve facial proportions, hairstyle, skin tone and apparent age.
- Do not replace the child with the model from the reference image.
- Keep the result natural and age-appropriate.

DESIGN INFORMATION:
Category: ${style}
Reference model: ${model}
T-shirt color: ${color}
Name to print: ${name}

Use the second image as inspiration for:
- graphic design language
- composition
- mood
- background
- lighting
- accessories where appropriate

Put the exact name "${name}" clearly on the T-shirt.

The design must look realistically printed on the fabric,
including folds, perspective and lighting.

Create one premium portrait-oriented ecommerce/social-media image.
No watermark.
No unnecessary extra text.
`;

    const result = await openai.images.edit({
      model: "gpt-image-2",
      image: images,
      prompt,
      size: "1024x1536",
      quality: "medium",
    });

    const image = result.data?.[0]?.b64_json;

    if (!image) {
      throw new Error(
        "Die Bild-API hat kein Bild zurückgegeben."
      );
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      image,
    });

  } catch (error) {
    console.error(error);

    const message =
      error?.status === 401
        ? "OpenAI-API-Schlüssel ist ungültig oder nicht freigeschaltet."
        : error?.message ||
          "Fehler bei der KI-Bildgenerierung.";

    return res
      .status(
        error?.status && Number.isInteger(error.status)
          ? error.status
          : 500
      )
      .json({
        error: message,
      });
  }
}
