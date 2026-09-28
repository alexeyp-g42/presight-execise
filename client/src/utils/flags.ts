const COUNTRY_CODES: Record<string, string> = {
  American: "US",
  Argentinian: "AR",
  Australian: "AU",
  Austrian: "AT",
  Brazilian: "BR",
  British: "GB",
  Canadian: "CA",
  Chilean: "CL",
  Chinese: "CN",
  Colombian: "CO",
  Czech: "CZ",
  Danish: "DK",
  Dutch: "NL",
  Egyptian: "EG",
  Emirati: "AE",
  Filipino: "PH",
  Finnish: "FI",
  French: "FR",
  German: "DE",
  Greek: "GR",
  Indian: "IN",
  Indonesian: "ID",
  Irish: "IE",
  Italian: "IT",
  Japanese: "JP",
  Kenyan: "KE",
  Korean: "KR",
  Mexican: "MX",
  Moroccan: "MA",
  "New Zealander": "NZ",
  Nigerian: "NG",
  Norwegian: "NO",
  Pakistani: "PK",
  Polish: "PL",
  Portuguese: "PT",
  Saudi: "SA",
  "South African": "ZA",
  Spanish: "ES",
  Swedish: "SE",
  Swiss: "CH",
  Thai: "TH",
  Turkish: "TR",
  Ukrainian: "UA",
  Vietnamese: "VN",
};

const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - "A".charCodeAt(0);

export const getFlag = (nationality: string) => {
  const code = COUNTRY_CODES[nationality];
  if (!code) return "🏳️";
  return String.fromCodePoint(...[...code].map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
};
