import { create } from 'zustand';

export type Animal = {
    id: string;
    breed: string;
    age: number;
    gender: 'm' | 'w';
    currentWeight: number;
    birthDate: string;
    notes?: string;
    weights: { date: string; weight: number }[];
    pasture: string;
    lastPastureChange: string;
    nextPastureChange?: string;
    pastureNotes?: string;
    vaccinations: { date: string; type: string; notes?: string }[];
    treatments: { date: string; type: string; notes?: string }[];
    reminders: { type: string; date: string; notes?: string }[];
};

export type Herd = {
    id: string;
    name: string;
    animals: Animal[];
};

type Store = {
    herds: Herd[];
    addHerd: (herd: Omit<Herd, 'id'>) => void;
    updateHerd: (id: string, herd: Partial<Omit<Herd, 'id'>>) => void;
    removeHerd: (id: string) => void;
    addAnimal: (herdId: string, animal: Animal) => void;
    updateAnimal: (herdId: string, animalId: string, animal: Partial<Animal>) => void;
    removeAnimal: (herdId: string, animalId: string) => void;
};

// --- Testdaten-Generator ---
const herdNames = ['Nordweide', 'Südhang', 'Waldwiese', 'Bergblick', 'Talgrund', 'Sonnenhof', 'Eichenhain', 'Rosenfeld'];
const breeds = ['Fleckvieh', 'Angus', 'Charolais', 'Limousin', 'Holstein', 'Hereford'];
let globalAnimalId = 1;
function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().slice(0, 10);
}
function randomAnimal(i: number): Animal {
    const gender = Math.random() > 0.5 ? 'm' : 'w';
    const age = Math.floor(Math.random() * 10) + 1;
    const birthDate = randomDate(new Date(2014, 0, 1), new Date(2023, 0, 1));
    const currentWeight = Math.floor(Math.random() * 600) + 200;
    const weights = Array.from({ length: 5 }, (_, j) => ({
        date: randomDate(new Date(2022, 0, 1), new Date()),
        weight: Math.floor(currentWeight * (0.7 + 0.3 * j / 4)),
    }));
    return {
        id: String(globalAnimalId++),
        breed: breeds[Math.floor(Math.random() * breeds.length)],
        age,
        gender,
        currentWeight,
        birthDate,
        notes: '',
        weights,
        pasture: herdNames[Math.floor(Math.random() * herdNames.length)],
        lastPastureChange: randomDate(new Date(2023, 0, 1), new Date()),
        nextPastureChange: randomDate(new Date(), new Date(2025, 0, 1)),
        pastureNotes: '',
        vaccinations: [],
        treatments: [],
        reminders: [],
    };
}
const testHerds: Herd[] = Array.from({ length: 5 }, (_, i) => ({
    id: `herd-${i + 1}`,
    name: herdNames[Math.floor(Math.random() * herdNames.length)] + ' ' + (Math.floor(Math.random() * 100)),
    animals: Array.from({ length: 30 + Math.floor(Math.random() * 21) }, (_, j) => randomAnimal(j)),
}));
// --- Ende Testdaten-Generator ---

export const useStore = create<Store>((set) => ({
    herds: testHerds,
    addHerd: (herd) => set((state) => ({
        herds: [...state.herds, { ...herd, id: `herd-${Date.now()}` }],
    })),
    updateHerd: (id, herd) => set((state) => ({
        herds: state.herds.map((h) => h.id === id ? { ...h, ...herd } : h),
    })),
    removeHerd: (id) => set((state) => ({
        herds: state.herds.filter((h) => h.id !== id),
    })),
    addAnimal: (herdId, animal) => set((state) => ({
        herds: state.herds.map((h) => h.id === herdId ? { ...h, animals: [...h.animals, animal] } : h),
    })),
    updateAnimal: (herdId, animalId, animal) => set((state) => ({
        herds: state.herds.map((h) => h.id === herdId ? {
            ...h,
            animals: h.animals.map((a) => a.id === animalId ? { ...a, ...animal } : a),
        } : h),
    })),
    removeAnimal: (herdId, animalId) => set((state) => ({
        herds: state.herds.map((h) => h.id === herdId ? {
            ...h,
            animals: h.animals.filter((a) => a.id !== animalId),
        } : h),
    })),
})); 