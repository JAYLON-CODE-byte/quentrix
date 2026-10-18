// MEMORY: Handles saving and loading data (The Second Brain)
export const Memory = {
    // Loads memory from the browser's local storage
    load() {
        try {
            const saved = localStorage.getItem("quentrix.memory");
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Failed to load memory", e);
        }
        
        // Default memory if nothing is saved yet
        return {
            profile: { 
                name: "Jaylon", 
                age: 17, 
                location: "South Africa" 
            },
            preferences: { 
                style: "step-by-step, define jargon, no hype" 
            },
            projects: [],
            notes: []
        };
    },
    
    // Saves memory to the browser
    save(data) {
        try {
            localStorage.setItem("quentrix.memory", JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("Failed to save memory", e);
            return false;
        }
    }
};
