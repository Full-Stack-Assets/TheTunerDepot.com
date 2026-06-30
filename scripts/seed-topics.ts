/**
 * Curated evergreen car-culture topics for the seed/backfill runner
 * (scripts/seed.ts). Unlike the hourly pipeline — which writes about whatever is
 * trending right now — these are timeless explainers that stand up a real back
 * catalog on demand. Edit freely: add, remove, or reorder. Order matters only
 * for date spreading (earlier = more recent publish date by default).
 *
 * The LLM assigns each post a category from siteConfig.categories
 * (news · builds · performance · evs · reviews · culture).
 */
export const SEED_TOPICS: string[] = [
  // ── Stance & aesthetics ────────────────────────────────────────
  'What is stance culture and why enthusiasts lower their cars',
  'Negative camber explained: function, fashion, and the tradeoffs',
  'How coilovers work and how to dial in ride height for a stanced build',
  'Air suspension vs static lowering for show cars and daily drivers',
  'Wheel fitment basics: offset, poke, and tuck explained',
  'Stretching tires on wide wheels: why people do it and the risks',
  'Static stanced builds: what it takes to drive slammed every day',
  'Bagged vs static stance: pros and cons for enthusiasts',
  'How to avoid rubbing and fender damage on aggressive fitment',

  // ── Car meets & scene culture ────────────────────────────────────
  'How to find and attend your first local car meet',
  'Cars and coffee etiquette for new enthusiasts',
  'JDM car meet culture in the United States',
  'Track days vs car meets: how to get started in both scenes',
  'Building a show-quality interior for meets and concours events',
  'Rolling shots and meet photography tips for car enthusiasts',
  'How car clubs organize cruises and charity meets',

  // ── Aftermarket & tuning ─────────────────────────────────────────
  'Aftermarket exhaust systems: cat-back vs full system explained',
  'ECU tuning and reflashing for more horsepower on street cars',
  'Turbocharging vs supercharging for daily-driven performance cars',
  'Widebody kits: bolt-on fender flares vs full conversions',
  'Cold air intakes: real horsepower gains vs placebo modifications',
  'Engine swaps that changed car culture: 2JZ, LS, and K-series',
  'Aftermarket brake upgrades: when stock rotors are not enough',
  'Coilover spring rates and damping for street and track use',
  'Aftermarket intakes, intercoolers, and supporting mods explained',

  // ── Performance & handling ───────────────────────────────────────
  'How to read a dyno chart and what the numbers actually mean',
  'Suspension geometry after lowering: camber, toe, and bump steer',
  'Choosing performance tires for track days and spirited driving',
  'Weight reduction mods that actually help lap times',
  'Bolt-on horsepower mods ranked: intakes, exhausts, and tunes',
  'Limited-slip differentials and why they matter for enthusiasts',
  'Big brake kits vs upgraded pads and fluid for track use',

  // ── Builds & DIY ─────────────────────────────────────────────────
  'Project car budgeting: how much a full build really costs',
  'Rust repair and body prep before a respray or wrap',
  'Vinyl wrap vs paint: durability and cost for custom looks',
  'DIY detailing for show-ready paint at home',
  'Documenting a build on social media without oversharing',
  'How to plan an engine rebuild timeline and parts list',

  // ── Reviews, icons & culture ─────────────────────────────────────
  'Iconic tuner cars that defined a generation: Supra, GT-R, Civic Type R',
  'The history of import tuning in the 1990s and 2000s',
  'Why manual transmissions still matter to enthusiasts',
  'Drift culture vs time attack: two paths to driving skill',
  'Aftermarket wheels: forged vs cast and what enthusiasts pay for',
  'The rise of restomods and modern classics in car culture',

  // ── EVs & modern performance ─────────────────────────────────────
  'Aftermarket tuning for electric performance cars',
  'EV battery health and how enthusiasts preserve range',
  'Hybrid performance mods worth doing on modern sports cars',
];
