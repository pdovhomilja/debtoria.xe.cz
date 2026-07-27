import type { DocumentRenderer } from "@/lib/providers/types";

export const fakeDocumentRenderer: DocumentRenderer = {
  async render(html) {
    return { content: Buffer.from(html), contentType: "text/html", ext: "html" };
  },
};
