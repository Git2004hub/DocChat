import {
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

import { buildPromptMessages } from "../src/lib/rag/prompt";

import type {
  ChatMessage,
  Source,
} from "../src/lib/types/chat";

function testPrompt() {
  const sources: Source[] = [
    {
      content:
        "BFS explore les nœuds les plus proches de la racine en premier.",
      page: 7,
      score: 0.91,
    },
    {
      content:
        "DFS explore les nœuds les plus profonds en premier.",
      page: 7,
      score: 0.87,
    },
  ];

  const history: ChatMessage[] = [
    {
      role: "user",
      content:
        "Nous parlons des algorithmes de recherche.",
    },
    {
      role: "assistant",
      content:
        "D'accord, quelle information souhaitez-vous ?",
    },
  ];

  const question =
    "Quelle est la différence entre BFS et DFS ?";

  const messages = buildPromptMessages(
    question,
    sources,
    history,
  );

  console.log(
    `Nombre de messages générés : ${messages.length}`,
  );

  messages.forEach((message, index) => {
    console.log("\n----------------------------");
    console.log(`Message ${index + 1}`);
    console.log(
      `Type : ${message.constructor.name}`,
    );
    console.log(message.text);
  });

  if (!(messages[0] instanceof SystemMessage)) {
    throw new Error(
      "Le test a échoué : le premier message doit être un SystemMessage.",
    );
  }

  const lastMessage =
    messages[messages.length - 1];

  if (!(lastMessage instanceof HumanMessage)) {
    throw new Error(
      "Le test a échoué : le dernier message doit être un HumanMessage.",
    );
  }

  const finalContent = lastMessage.text;

  if (!finalContent.includes(question)) {
    throw new Error(
      "Le test a échoué : la question n'est pas présente dans le prompt.",
    );
  }

  if (
    !finalContent.includes(
      "BFS explore les nœuds",
    )
  ) {
    throw new Error(
      "Le test a échoué : les sources ne sont pas présentes dans le prompt.",
    );
  }

  if (
    !messages[0].text.includes(
      "uniquement",
    )
  ) {
    throw new Error(
      "Le test a échoué : l'instruction de limitation au document est absente.",
    );
  }

  console.log(
    "\n✅ Test de construction du prompt réussi.",
  );
}

try {
  testPrompt();
} catch (error) {
  console.error(
    "❌ Erreur pendant le test du prompt :",
    error,
  );

  process.exit(1);
}