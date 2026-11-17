export type Genre = { id: string; label: string; query: string };

export const GENRES: Genre[] = [
  { id: "tout", label: "Tout", query: "nouvo mizik ayisyen 2026" },
  { id: "konpa", label: "Konpa", query: "konpa official audio" },
  { id: "raboday", label: "Rabòday", query: "raboday song" },
  { id: "amapiano", label: "Amapiano", query: "amapiano official audio" },
  { id: "drill", label: "Drill", query: "drill official video" },
  { id: "afrobeat", label: "Afrobeat", query: "afrobeat official audio" },
  { id: "rap-kreyol", label: "Rap Kreyòl", query: "rap kreyol official" },
];

export function genreById(id: string): Genre {
  return GENRES.find((g) => g.id === id) ?? GENRES[0]!;
}
