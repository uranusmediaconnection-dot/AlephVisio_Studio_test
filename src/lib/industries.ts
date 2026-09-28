/** Industry catalog powering the wizard dropdown and prompt enrichment. */

export interface IndustryDef {
  id: string;
  label: string;
  services: string[];
  paletteHint: string;
}

export const INDUSTRIES: IndustryDef[] = [
  { id: "restaurant", label: "Restaurant & Café", services: ["Dine-in service", "Takeout & delivery", "Private events", "Seasonal menus", "Gift cards", "Online reservations"], paletteHint: "warm terracotta and cream" },
  { id: "dental", label: "Dental Clinic", services: ["General dentistry", "Teeth whitening", "Invisalign", "Dental implants", "Pediatric care", "Emergency visits"], paletteHint: "clean aqua and white" },
  { id: "fitness", label: "Fitness Studio", services: ["Personal training", "Group classes", "Nutrition coaching", "Membership plans", "Online sessions", "Body assessments"], paletteHint: "energetic orange and charcoal" },
  { id: "legal", label: "Law Firm", services: ["Family law", "Business contracts", "Estate planning", "Personal injury", "Immigration", "Free consultation"], paletteHint: "deep navy and brass" },
  { id: "construction", label: "Construction & Remodeling", services: ["Kitchen remodeling", "Home additions", "Roofing", "Deck building", "Painting", "Free estimates"], paletteHint: "safety amber and slate" },
  { id: "salon", label: "Salon & Spa", services: ["Hair styling", "Coloring & balayage", "Manicures", "Facials", "Massage therapy", "Bridal packages"], paletteHint: "blush rose and champagne" },
  { id: "realestate", label: "Real Estate", services: ["Buyer representation", "Listing & staging", "Market analysis", "Property management", "Investment advisory", "Relocation support"], paletteHint: "forest green and sand" },
  { id: "auto", label: "Auto Repair", services: ["Oil changes", "Brake service", "Engine diagnostics", "Tire rotation", "AC repair", "State inspections"], paletteHint: "steel blue and graphite" },
  { id: "tech", label: "IT & Software Services", services: ["Managed IT", "Cloud migration", "Cybersecurity", "Helpdesk support", "Software development", "Data backup"], paletteHint: "electric teal and graphite" },
  { id: "landscaping", label: "Landscaping", services: ["Lawn care", "Hardscaping", "Irrigation systems", "Seasonal cleanup", "Tree trimming", "Garden design"], paletteHint: "leaf green and earth brown" },
  { id: "vet", label: "Veterinary Clinic", services: ["Wellness exams", "Vaccinations", "Surgery", "Dental cleaning", "Grooming", "24/7 emergency"], paletteHint: "meadow green and warm beige" },
  { id: "bakery", label: "Bakery & Desserts", services: ["Custom cakes", "Wedding desserts", "Daily pastries", "Gluten-free options", "Catering", "Corporate orders"], paletteHint: "buttercream and cocoa" },
  { id: "agency", label: "Marketing Agency", services: ["Brand strategy", "Social media", "SEO & content", "Paid advertising", "Web design", "Analytics reporting"], paletteHint: "bold coral and ink" },
  { id: "plumbing", label: "Plumbing Services", services: ["Leak repair", "Water heaters", "Drain cleaning", "Bathroom remodels", "Sewer inspection", "Emergency call-out"], paletteHint: "copper and deep blue" },
];

export function industryById(id: string): IndustryDef {
  return (
    INDUSTRIES.find((i) => i.id === id) ?? {
      id,
      label: id,
      services: ["Professional consultation", "Tailored service plans", "Fast turnaround", "Friendly support", "Transparent pricing", "Quality guarantee"],
      paletteHint: "refined neutral tones with one confident accent",
    }
  );
}
