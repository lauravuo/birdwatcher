export interface Sighting {
  id?: string;
  userId: string;
  birdId: string;
  date: string; // YYYY-MM-DD
  type: "visual" | "audial" | "both";
  notes?: string;
  createdAt: number;
}
