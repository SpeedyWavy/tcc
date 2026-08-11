// Mantenha isso em sincronia com UNIT_ADDRESSES em
// supabase/functions/generate-routes/index.ts (são runtimes diferentes -
// um roda no navegador, o outro no Deno do Supabase - por isso duplicado).
export const ENDERECOS_UNIDADES = {
  'Garcia': 'R. Antônio Ferreira Laranja, 57 - Jardim Garcia, Campinas - SP, 13061-090',
  'Vila Mimosa': 'R. das Gardênias, 90 - Vila Mimosa, Campinas - SP, 13050-051',
  'Swiss Park': 'Av. Dermival Bernardes Siqueira, 2026 - Swiss Park, Campinas - SP, 13049-252',
  'Vivendo e Aprendendo': 'R. Castelnuovo, 760 - Jardim Garcia, Campinas - SP, 13061-085',
}