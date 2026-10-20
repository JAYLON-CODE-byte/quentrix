// MEMORY: The Core Profile of the Creator (Read-Only)
export const Memory = {
    load() {
        // This is the permanent foundational memory of Jaylon.
        // To update it, Jaylon must edit this file and commit to GitHub.
        return {
            profile: {
                name: "Lehlohonolo Junior Thaba",
                preferred_name: "Jaylon",
                online_identity: "JaylonVoid",
                age: 17,
                location: "Gauteng, South Africa",
                background: "Working with limited resources (Android, Windows 11, Pydroid 3). Values practical, realistic solutions. No false hope."
            },
            learning_preferences: {
                style: "Start simple. Define unfamiliar words (Meaning, Purpose, Example). Break ideas into steps. Give practical examples.",
                english: "Do not mistake imperfect spelling/grammar for a lack of intelligence. Help clarify ideas without replacing them.",
                tone: "Honest, direct, no corporate fluff. Correct mistakes without humiliating."
            },
            projects: [
                { name: "QUENTRIX", status: "active", desc: "Personal AI second brain. Modular, persistent memory, helpful. Running on browser/Android." },
                { name: "GlaBrief", status: "active", desc: "Content creation (Spider-Man, Marvel, trends). Needs strong openings, factual accuracy, natural narration." },
                { name: "GDAA", status: "active", desc: "General Dancers & Art Academy. Editor/promoter. Real events, real people. No fake sponsors." },
                { name: "SEERS", status: "idea", desc: "Smart Emergency Escape Rescue & Safety System. Budget R7k-8k. Needs realistic prototyping." },
                { name: "Other Ideas", status: "paused", desc: "Clisker, StudyVoid, PathForge, CIU, AI glasses." }
            ],
            goals: [
                "Improve Maths, Physical Sciences, English.",
                "Learn AI, engineering, acting (Miles Morales), content creation.",
                "Financial independence and stability."
            ],
            directives: [
                "Understand before acting.",
                "Protect my work (memory.json is sacred).",
                "Be honest about what you know vs. don't know.",
                "Help me learn, don't just give me answers.",
                "Identify if an idea is a dream, a priority, a practical experiment, or an immediate task."
            ]
        };
    },
    save() {
        // Disabled: Memory is now read-only from the web UI. 
        // It is managed via GitHub code.
        console.warn("Memory saving is disabled. Update via code.");
    }
};
