import { describe, it, expect } from "vitest";
import { parseNoticeXml } from "../../src/api/xml-parser.js";

// Format réel retourné par GET /notice/{num} (validé en prod le 2026-04-20)
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TradeMark operationCode="Update">
  <RegistrationOfficeCode>FR</RegistrationOfficeCode>
  <ApplicationNumber>4216963</ApplicationNumber>
  <ApplicationDate>2018-01-15</ApplicationDate>
  <ExpiryDate>2028-01-15</ExpiryDate>
  <MarkCurrentStatusCode>Registered</MarkCurrentStatusCode>
  <MarkFeature>Word</MarkFeature>
  <WordMarkSpecification>
    <MarkVerbalElementText>FRESHMEAL</MarkVerbalElementText>
  </WordMarkSpecification>
  <GoodsServicesDetails>
    <GoodsServices>
      <ClassDescriptionDetails>
        <ClassDescription>
          <ClassNumber>29</ClassNumber>
        </ClassDescription>
        <ClassDescription>
          <ClassNumber>43</ClassNumber>
        </ClassDescription>
      </ClassDescriptionDetails>
    </GoodsServices>
  </GoodsServicesDetails>
  <ApplicantDetails>
    <Applicant>
      <ApplicantIdentifier identifierKindCode="FR">123456789</ApplicantIdentifier>
      <ApplicantAddressBook>
        <FormattedNameAddress>
          <Name>
            <FormattedName>
              <OrganizationName>FRESHMEAL SAS</OrganizationName>
            </FormattedName>
          </Name>
          <Address>
            <AddressCountryCode>FR</AddressCountryCode>
          </Address>
        </FormattedNameAddress>
      </ApplicantAddressBook>
    </Applicant>
    <Applicant>
      <ApplicantAddressBook>
        <FormattedNameAddress>
          <Name>
            <FormattedName>
              <OrganizationName>PARTNER LTD</OrganizationName>
            </FormattedName>
          </Name>
          <Address>
            <AddressCountryCode>GB</AddressCountryCode>
          </Address>
        </FormattedNameAddress>
      </ApplicantAddressBook>
    </Applicant>
  </ApplicantDetails>
  <MarkRecordDetails>
    <MarkRecord>
      <BasicRecord>
        <BasicRecordKind>Filing</BasicRecordKind>
        <RecordPublicationDetails>
          <RecordPublication>
            <PublicationIdentifier>2018-05</PublicationIdentifier>
            <PublicationDate>2018-01-15</PublicationDate>
          </RecordPublication>
        </RecordPublicationDetails>
      </BasicRecord>
    </MarkRecord>
    <MarkRecord>
      <BasicRecord>
        <BasicRecordKind>Registration</BasicRecordKind>
        <RecordPublicationDetails>
          <RecordPublication>
            <PublicationIdentifier>2018-25</PublicationIdentifier>
            <PublicationDate>2018-06-01</PublicationDate>
          </RecordPublication>
        </RecordPublicationDetails>
      </BasicRecord>
    </MarkRecord>
  </MarkRecordDetails>
</TradeMark>`;

const MINIMAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TradeMark>
  <ApplicationNumber>1234567</ApplicationNumber>
  <MarkCurrentStatusCode>Pending</MarkCurrentStatusCode>
  <WordMarkSpecification>
    <MarkVerbalElementText>TESTMARK</MarkVerbalElementText>
  </WordMarkSpecification>
</TradeMark>`;

describe("xml-parser", () => {
  it("should parse a notice XML into TrademarkDetails", () => {
    const result = parseNoticeXml(SAMPLE_XML);

    expect(result.applicationNumber).toBe("4216963");
    expect(result.mark).toBe("FRESHMEAL");
    expect(result.markType).toBe("Word");
    expect(result.status).toBe("Registered");
    expect(result.applicationDate).toBe("2018-01-15");
    expect(result.expiryDate).toBe("2028-01-15");
    expect(result.collection).toBe("FR");
  });

  it("should extract all Nice class numbers", () => {
    const result = parseNoticeXml(SAMPLE_XML);

    expect(result.classNumbers).toEqual([29, 43]);
  });

  it("should extract holder names", () => {
    const result = parseNoticeXml(SAMPLE_XML);

    expect(result.holders).toHaveLength(2);
    expect(result.holders[0]).toEqual({
      name: "FRESHMEAL SAS",
      identifier: "123456789",
      country: "FR",
    });
    expect(result.holders[1]).toEqual({
      name: "PARTNER LTD",
      identifier: undefined,
      country: "GB",
    });
  });

  it("should extract events with dates", () => {
    const result = parseNoticeXml(SAMPLE_XML);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toEqual({
      type: "Filing",
      date: "2018-01-15",
      description: "2018-05",
    });
    expect(result.events[1]).toEqual({
      type: "Registration",
      date: "2018-06-01",
      description: "2018-25",
    });
  });

  it("should handle missing optional fields gracefully", () => {
    const result = parseNoticeXml(MINIMAL_XML);

    expect(result.applicationNumber).toBe("1234567");
    expect(result.mark).toBe("TESTMARK");
    expect(result.status).toBe("Pending");
    expect(result.markType).toBeUndefined();
    expect(result.applicationDate).toBeUndefined();
    expect(result.registrationDate).toBeUndefined();
    expect(result.expiryDate).toBeUndefined();
    expect(result.collection).toBeUndefined();
    expect(result.classNumbers).toEqual([]);
    expect(result.holders).toEqual([]);
    expect(result.events).toEqual([]);
  });
});
