/**
 * Parse les notices XML INPI → JSON plat (TrademarkDetails).
 *
 * GET /marques/notice/{num} retourne du XML (format WIPO ST.96 / INPI).
 * Ce module extrait les champs utiles sans dépendance externe.
 */

import type { TrademarkDetails, TrademarkHolder, TrademarkEvent } from "./types.js";

/** Extrait le contenu texte du premier tag correspondant. */
function getText(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  const value = match?.[1]?.trim();
  return value || undefined;
}

/** Extrait tous les blocs `<tag>...</tag>` (y compris multi-lignes). */
function getBlocks(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(regex) ?? [];
}

/** Extrait toutes les valeurs texte d'un tag répété. */
function getAllText(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const value = match[1].trim();
    if (value) results.push(value);
  }
  return results;
}

function parseHolders(xml: string): TrademarkHolder[] {
  const blocks = getBlocks(xml, "Applicant");
  if (blocks.length === 0) return [];

  return blocks.map((block) => {
    // Format réel : <FormattedName><OrganizationName> ou <LastName>
    const name =
      getText(block, "OrganizationName") ??
      getText(block, "LastName") ??
      getText(block, "ApplicantName") ??
      "";
    // <ApplicantIdentifier identifierKindCode="FR">752461707</ApplicantIdentifier>
    const identifier = getText(block, "ApplicantIdentifier");
    const country = getText(block, "AddressCountryCode") ?? getText(block, "Country");
    return { name, identifier, country };
  }).filter((h) => h.name !== "");
}

function parseEvents(xml: string): TrademarkEvent[] {
  // Format réel : <MarkRecord><BasicRecord><BasicRecordKind> + <PublicationDate>
  const blocks = getBlocks(xml, "MarkRecord");
  if (blocks.length === 0) return [];

  return blocks.map((block) => ({
    type: getText(block, "BasicRecordKind") ?? getText(block, "MarkEventCode") ?? "",
    date: getText(block, "PublicationDate") ?? getText(block, "MarkEventDate") ?? "",
    description: getText(block, "PublicationIdentifier"),
  })).filter((e) => e.type !== "" && e.date !== "");
}

function parseClassNumbers(xml: string): number[] {
  return getAllText(xml, "ClassNumber")
    .map(Number)
    .filter((n) => !isNaN(n) && n >= 1 && n <= 45);
}

/**
 * Parse la réponse XML de POST /marques/search.
 *
 * Format :
 * <trademarkSearch>
 *   <metadata><count>19</count><position>0</position><size>3</size></metadata>
 *   <results>
 *     <result documentId="...">
 *       <fields>
 *         <field name="ApplicationNumber"><value>4773435</value></field>
 *         <field name="Mark"><value>Jouve</value></field>
 *         <field name="MarkCurrentStatusCode"><value>Marque enregistrée</value></field>
 *         <field name="DEPOSANT"><value>Madame Florence Jouve</value></field>
 *         <field name="ukey"><value>FMARK|4773435</value></field>
 *       </fields>
 *     </result>
 *   </results>
 * </trademarkSearch>
 */
import type { SearchResponse, TrademarkSearchResult } from "./types.js";

function getFieldValue(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<field[^>]+name="${name}"[^>]*>\\s*<value>([^<]*)<\\/value>`, "i")
  );
  return match?.[1]?.trim() ?? "";
}

function collectionFromUkey(ukey: string): string {
  if (ukey.startsWith("FMARK")) return "FR";
  if (ukey.startsWith("EUMARK") || ukey.startsWith("CTMMARK")) return "EU";
  if (ukey.startsWith("WOMARK") || ukey.startsWith("WMARK")) return "WO";
  return "";
}

export function parseSearchXml(xml: string): SearchResponse {
  const total = Number(getText(xml, "count") ?? "0");
  const position = Number(getText(xml, "position") ?? "0");

  const resultBlocks = getBlocks(xml, "result");
  const results: TrademarkSearchResult[] = resultBlocks.map((block) => {
    const ukey = getFieldValue(block, "ukey");
    return {
      applicationNumber: getFieldValue(block, "ApplicationNumber"),
      mark: getFieldValue(block, "Mark"),
      status: getFieldValue(block, "MarkCurrentStatusCode"),
      holder: getFieldValue(block, "DEPOSANT"),
      classNumbers: [],
      collection: collectionFromUkey(ukey) || undefined,
      ukey: ukey || undefined,
    };
  });

  return { results, total, position };
}

/**
 * Parse une notice XML INPI en TrademarkDetails.
 *
 * Format attendu (WIPO ST.96 / INPI) :
 * ```xml
 * <Trademark>
 *   <ApplicationNumber>4216963</ApplicationNumber>
 *   <MarkCurrentStatusCode>Registered</MarkCurrentStatusCode>
 *   <MarkVerbalElement>FRESHMEAL</MarkVerbalElement>
 *   <MarkFeature>Word</MarkFeature>
 *   <ApplicationDate>2018-01-01</ApplicationDate>
 *   <RegistrationDate>2018-06-01</RegistrationDate>
 *   <ExpiryDate>2028-01-01</ExpiryDate>
 *   <Collection>FR</Collection>
 *   <GoodsServicesClassificationBag>
 *     <GoodsServicesClassification>
 *       <ClassNumber>29</ClassNumber>
 *     </GoodsServicesClassification>
 *   </GoodsServicesClassificationBag>
 *   <ApplicantBag>
 *     <Applicant>
 *       <ApplicantName>COMPANY SAS</ApplicantName>
 *       <ApplicantIdentifier>123456789</ApplicantIdentifier>
 *       <Country>FR</Country>
 *     </Applicant>
 *   </ApplicantBag>
 *   <MarkEventBag>
 *     <MarkEvent>
 *       <MarkEventCode>Registration</MarkEventCode>
 *       <MarkEventDate>2018-06-01</MarkEventDate>
 *       <MarkEventDescription>Marque enregistrée</MarkEventDescription>
 *     </MarkEvent>
 *   </MarkEventBag>
 * </Trademark>
 * ```
 */
export function parseNoticeXml(xml: string): TrademarkDetails {
  return {
    applicationNumber: getText(xml, "ApplicationNumber") ?? "",
    // Format réel : <WordMarkSpecification><MarkVerbalElementText>
    mark: getText(xml, "MarkVerbalElementText") ?? getText(xml, "MarkVerbalElement") ?? "",
    markType: getText(xml, "MarkFeature"),
    status: getText(xml, "MarkCurrentStatusCode") ?? "",
    classNumbers: parseClassNumbers(xml),
    holders: parseHolders(xml),
    applicationDate: getText(xml, "ApplicationDate"),
    registrationDate: getText(xml, "RegistrationDate"),
    expiryDate: getText(xml, "ExpiryDate"),
    events: parseEvents(xml),
    // Format réel : <RegistrationOfficeCode>FR</RegistrationOfficeCode>
    collection: getText(xml, "RegistrationOfficeCode") ?? getText(xml, "Collection"),
  };
}
