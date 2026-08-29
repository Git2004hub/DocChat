import { chunkDocument } from "../src/lib/rag/chunking";
import type { ParsedPage } from "../src/lib/types/document";

async function testChunking() {
  const pages: ParsedPage[] = [
    {
      pageNumber: 1,
      content:
        "Ceci est une première page de test. ".repeat(80),
    },
    {
      pageNumber: 2,
      content:
        "Ceci est une deuxième page avec un contenu différent. ".repeat(60),
    },
  ];

  const chunks = await chunkDocument(
    pages,
    "test-document",
    "test.pdf",
  );

  console.log(`Nombre de chunks générés : ${chunks.length}`);

  for (const chunk of chunks) {
    console.log("\n----------------------------");
    console.log(`ID : ${chunk.id}`);
    console.log(`Page : ${chunk.page}`);
    console.log(`Document : ${chunk.documentName}`);
    console.log(`Taille : ${chunk.content.length}`);
    console.log(`Contenu : ${chunk.content.slice(0, 120)}...`);
  }

  if (chunks.length === 0) {
    throw new Error("Le test a échoué : aucun chunk généré.");
  }

  if (chunks.some((chunk) => !chunk.content.trim())) {
    throw new Error("Le test a échoué : un chunk est vide.");
  }

  if (chunks.some((chunk) => chunk.documentId !== "test-document")) {
    throw new Error(
      "Le test a échoué : le documentId n'a pas été conservé.",
    );
  }

  console.log("\n✅ Test de chunking réussi.");
}

testChunking().catch((error) => {
  console.error("❌ Erreur pendant le test du chunking :", error);
  process.exit(1);
});