/**
 * Classification de Nice — 45 classes, données embarquées.
 * Source : https://www.wipo.int/classifications/nice/fr/
 */

export interface NiceClass {
  number: number;
  title: string;
  examples: string;
}

export const NICE_CLASSES: NiceClass[] = [
  { number: 1, title: "Produits chimiques", examples: "Produits chimiques à usage industriel, scientifique ; colles industrielles ; engrais." },
  { number: 2, title: "Peintures, vernis", examples: "Peintures, vernis, laques ; produits contre la rouille ; colorants ; résines naturelles brutes." },
  { number: 3, title: "Cosmétiques, produits de nettoyage", examples: "Cosmétiques, parfums ; préparations pour blanchir et nettoyer ; dentifrices." },
  { number: 4, title: "Huiles et graisses industrielles", examples: "Huiles et graisses industrielles ; combustibles ; bougies ; cires." },
  { number: 5, title: "Produits pharmaceutiques", examples: "Médicaments, produits vétérinaires ; désinfectants ; produits diététiques." },
  { number: 6, title: "Métaux communs et leurs alliages", examples: "Métaux communs, alliages ; constructions métalliques ; câbles en métal." },
  { number: 7, title: "Machines et machines-outils", examples: "Machines, machines-outils ; moteurs ; appareils agricoles." },
  { number: 8, title: "Outils et instruments à main", examples: "Outils à main manuels ; coutellerie ; armes blanches." },
  { number: 9, title: "Appareils et instruments scientifiques", examples: "Appareils scientifiques, électriques ; logiciels ; lunettes ; appareils photo." },
  { number: 10, title: "Appareils et instruments médicaux", examples: "Appareils chirurgicaux, médicaux, dentaires ; prothèses ; articles orthopédiques." },
  { number: 11, title: "Appareils d'éclairage, chauffage", examples: "Appareils d'éclairage, de chauffage, de réfrigération ; appareils sanitaires." },
  { number: 12, title: "Véhicules", examples: "Véhicules, appareils de locomotion par terre, air ou eau." },
  { number: 13, title: "Armes à feu", examples: "Armes à feu, munitions, projectiles ; explosifs ; feux d'artifice." },
  { number: 14, title: "Métaux précieux", examples: "Métaux précieux, alliages ; bijoux, joaillerie ; montres, instruments chronométriques." },
  { number: 15, title: "Instruments de musique", examples: "Instruments de musique ; stands pour instruments de musique." },
  { number: 16, title: "Papier, carton, produits d'imprimerie", examples: "Papier, carton ; imprimés ; livres, magazines ; papeterie ; emballages en plastique." },
  { number: 17, title: "Caoutchouc, plastiques", examples: "Caoutchouc, gutta-percha, gomme ; matières isolantes ; tuyaux flexibles." },
  { number: 18, title: "Cuir et imitations du cuir", examples: "Cuir, imitations du cuir ; sacs, valises, parapluies." },
  { number: 19, title: "Matériaux de construction non métalliques", examples: "Matériaux de construction non métalliques ; verre de construction ; monuments non métalliques." },
  { number: 20, title: "Meubles, miroirs", examples: "Meubles, miroirs, cadres ; coffres-forts non métalliques ; matières plastiques non comprises ailleurs." },
  { number: 21, title: "Ustensiles et récipients pour le ménage", examples: "Ustensiles, récipients pour le ménage ; articles en verre, porcelaine ; brosses." },
  { number: 22, title: "Cordes, filets, tentes", examples: "Cordes, ficelles, filets, tentes, bâches ; sacs d'emballage non en papier." },
  { number: 23, title: "Fils à usage textile", examples: "Fils et filés à usage textile." },
  { number: 24, title: "Tissus et textiles", examples: "Tissus et leurs substituts ; linge de maison ; tentures en matières textiles." },
  { number: 25, title: "Vêtements, chaussures", examples: "Vêtements, chaussures, chapellerie." },
  { number: 26, title: "Dentelles, rubans, broderies", examples: "Dentelles, rubans, broderies ; boutons, crochets ; cheveux artificiels." },
  { number: 27, title: "Tapis, revêtements de sols", examples: "Tapis, paillassons, nattes, linoléum ; papiers peints (non en matières textiles)." },
  { number: 28, title: "Jeux, jouets", examples: "Jeux, jouets ; appareils de sport ; décorations pour sapins de Noël." },
  { number: 29, title: "Viande, poisson, produits alimentaires", examples: "Viande, poisson, volaille ; extraits de viande ; légumes et fruits conservés, séchés ou cuits." },
  { number: 30, title: "Café, farine, boulangerie", examples: "Café, thé, cacao, sucre ; produits de boulangerie, confiserie ; glaces alimentaires." },
  { number: 31, title: "Produits agricoles, animaux vivants", examples: "Céréales, produits agricoles non transformés ; animaux vivants ; fruits et légumes frais." },
  { number: 32, title: "Bières, eaux, boissons non alcoolisées", examples: "Bières ; eaux minérales, gazeuses ; boissons de fruits, jus ; sirops." },
  { number: 33, title: "Boissons alcoolisées", examples: "Boissons alcoolisées (à l'exception des bières) ; préparations pour boissons alcoolisées." },
  { number: 34, title: "Tabac, articles pour fumeurs", examples: "Tabac, articles pour fumeurs ; cigarettes électroniques ; allumettes." },
  { number: 35, title: "Publicité, gestion des affaires", examples: "Publicité ; gestion des affaires commerciaux ; travaux de bureau ; vente au détail." },
  { number: 36, title: "Assurances, affaires financières", examples: "Assurances ; affaires financières, monétaires ; affaires immobilières." },
  { number: 37, title: "Construction, réparations", examples: "Services de construction ; installation et réparation ; services de nettoyage de bâtiments." },
  { number: 38, title: "Télécommunications", examples: "Télécommunications ; services téléphoniques, de messagerie ; services Internet." },
  { number: 39, title: "Transport, emballage et stockage", examples: "Transport, emballage et stockage de marchandises ; organisation de voyages." },
  { number: 40, title: "Traitement des matériaux", examples: "Traitement des matériaux ; soudage, sablage, thermolaquage ; impression ; recyclage." },
  { number: 41, title: "Éducation, divertissement", examples: "Éducation, formation ; divertissement ; activités sportives et culturelles ; édition." },
  { number: 42, title: "Services scientifiques, recherche", examples: "Services scientifiques, recherche ; conception, développement logiciel ; services informatiques." },
  { number: 43, title: "Services de restauration", examples: "Services de restauration, traiteurs ; hébergement temporaire (hôtels, restaurants)." },
  { number: 44, title: "Services médicaux, vétérinaires", examples: "Services médicaux, vétérinaires ; soins d'hygiène pour êtres humains ou animaux ; jardinage." },
  { number: 45, title: "Services juridiques, sécurité", examples: "Services juridiques ; sécurité de personnes ou de biens ; services personnels et sociaux." },
];

export function formatNiceClasses(): string {
  return NICE_CLASSES.map(
    (c) => `Classe ${c.number} — ${c.title}\n  ${c.examples}`
  ).join("\n\n");
}
