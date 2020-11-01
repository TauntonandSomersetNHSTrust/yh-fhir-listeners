# Yeovil District Hospital - SIDeR FHIR Listener Endpoints

[![GitHub Release](https://img.shields.io/github/release/Fdawgs/ydh-fhir-listeners.svg)](https://github.com/Fdawgs/ydh-fhir-listeners/releases/latest/) [![Build Status](https://travis-ci.com/Fdawgs/ydh-fhir-listeners.svg?branch=master)](https://travis-ci.com/Fdawgs/ydh-fhir-listeners) [![Known Vulnerabilities](https://snyk.io/test/github/Fdawgs/ydh-fhir-listeners/badge.svg)](https://snyk.io/test/github/Fdawgs/ydh-fhir-listeners) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

> Yeovil District Hospital's Mirth Connect FHIR Listener channel adapted for use with InterSystems TrakCare PAS (v2017.2 MR8.2)

## Introduction

### Purpose

This repo outlines the steps that have been taken to provide the technical deliverables required by the SIDeR programme, alongside the issues that were encountered during development, and how to deploy the resulting Mirth Connect channel.

Work logs and issues are found in [docs/worklogs](https://github.com/Fdawgs/ydh-fhir-listeners/tree/master/docs/worklogs).

The intended audience for this page are team members of the Solutions Development team at Yeovil District Hospital NHS Foundation Trust, alongside technical partners and developers from other stakeholders in the programme should they wish to use this and adapt it to implement into their own systems. Musgrove Park Hospital (part of SFT) have successfully taken this and refactored it for use with their PAS, Maxims.

This documentation is written under the assumption that the reader has prior experience using [Mirth Connect](https://github.com/nextgenhealthcare/connect).

### Background

[Somerset Clinical Commissioning Group](https://www.somersetccg.nhs.uk/#) (CCG) started the [SIDeR project](https://www.somersetccg.nhs.uk/your-health/sharing-your-information/sider/) with the purpose of linking up all main clinical and social care IT systems used in Somerset to improve and support direct care. [Black Pear Software Ltd.](https://www.blackpear.com/) (BP) is the technical partner that supports the project.

Stakeholders (as of 2020-11-01) are:

-   [Children's Hospice South West](https://www.chsw.org.uk/) (CHSW)
-   [Devon Doctors](https://www.devondoctors.co.uk/) (DD)
-   [Dorothy House Hospice](https://www.dorothyhouse.org.uk/) (DHH)
-   GP practices within Somerset (GPs)
-   [Somerset County Council](https://www.somerset.gov.uk/) (SCC)
-   [Somerset NHS Foundation Trust](https://www.somersetft.nhs.uk/) (SFT)
-   [South Western Ambulance Service NHS Foundation Trust](https://www.swast.nhs.uk/) (SWASFT)
-   [St Margaret’s Hospice](https://www.somerset-hospice.org.uk/) (SMH)
-   [Yeovil District Hospital NHS Foundation Trust](https://yeovilhospital.co.uk/) (YDH)

### Deliverables

#### Care Connect RESTful FHIR API endpoints

Black Pear have built a single-page web application for a shared care record, which will retrieve data relating to a patient from each stakeholder that have the capability to do so, and amalgamate it into this record. The record is not stored in a cache anywhere and is built on the fly.
Care providers can then access this record through a contextual link (an embedded link within the PAS).
Clients using the web app need to be able to make GET requests to RESTful HL7® FHIR® API endpoints to retrieve a set of [seven FHIR resources](https://github.com/Fdawgs/ydh-fhir-listeners/blob/master/docs/worklogs/fhir_endpoints.md) that adhere to their respective [NHS Care Connect API profiles](https://nhsconnect.github.io/CareConnectAPI/) to populate the record.

#### Contextual Link

A contextual link needs to be added to our PAS to allow care providers access to the shared record. Refer to [Interoperability patterns - Contextual launch](https://github.com/Somerset-SIDeR-Programme/SIDeR-interop-patterns/wiki/contextual-launch) in the SIDeR wiki for more information.

## Prerequisites

-   Latest release of [Mirth Connect](https://github.com/nextgenhealthcare/connect) installed (including supporting database instance)
-   Latest release of the Mirth Connect [FHIR Connector extension](https://ng.nextgen.com/l/488571/2018-03-16/6w3yr)
-   Latest release of [ydh-authentication-service](https://github.com/Fdawgs/ydh-authentication-service) (for securing endpoints with HTTPs and bearer tokens)
-   [Node.js](https://nodejs.org/en/) (optional, for development)
-   [Yarn](https://yarnpkg.com) (optional, for development)

## Deployment

This Mirth Connect channel has been tested on a Mirth Connect instance (v3.9.1) running on Windows 10 and Windows Server 2019, with an instance of SQL Server 2019 being used as the database backend for Mirth Connect.

### Setting up Mirth Connect Channel

1. Ensure all prerequisites have been met, and you have a running instance of Mirth Connect
2. Install the FHIR Connector extension from the file system
3. Import the FHIR Listener channel from [dist](https://github.com/Fdawgs/ydh-fhir-listeners/tree/master/dist) into Mirth Connect
4. Declare variables listed in the channel description, in the configuration map
5. Deploy channel

## Known issues and caveats

Issues with InterSystems TrakCare PAS (used by YDH) and staff misuse of the PAS have affected how the data is presented in the endpoints, and how searches can be performed.

### Data quality

-   AllergyIntolerance resources:
    -   Unable to provide SNOMED codes for allergies and intolerances in AllergyIntolerance resources due to these being free text inputs in TrakCare
-   Condition resources:
    -   Unable to provide Condition resources as conditions are held in SimpleCode, not TrakCare
-   DocumentReference resources:
    -   Unable to provide DocumentReference resources as these are held in Patient Centre, not TrakCare
-   Encounter resources:
    -   Discharge/end dates for outpatient Encounter resources are not provided due to poor data quality. Staff in outpatients misuse these input fields in TrakCare to mark when “all admin has been completed for that outpatient encounter” and not when the encounter actually finished
    -   Unable to provide clinician contact details for Encounter resources due to the following:
        -   In TrakCare a care provider has a mobile number field against them, but it is rarely populated
        -   There is not an internal contact number field in TrakCare
        -   If you want to reach say, a gynaecology consultant, you need to manually search a list on YDH’s intranet for their secretary’s extension number, and there is no indication as to how current the list is
        -   Teams do not have contact number
-   Patient resources:
    -   Unable to provide SNOMED codes for religious affiliation for patient demographics due to these not being in TrakCare
    -   Sizeable number of patient records without postcodes

### Search caveats

-   Every search request to a FHIR resource endpoint that is **NOT** the Patient FHIR resource endpoint **MUST** have a `patient` search parameter, this is to stop intentional or unintentional DOS attacks due to long running SQL queries:
    -   `GET [baseUrl]/AllergyIntolerance?criticality=[code]` will return a 500 error
    -   `GET [baseUrl]/AllergyIntolerance?patient=[id]&criticality=[code]` will work

This is due to YDH not having direct control over the underlying databases of the PAS, so cannot add indexes or make appropriate performance tweaks to support searches without also filtering by patient.

## Contributing

Please see [CONTRIBUTING.md](https://github.com/Fdawgs/ydh-fhir-listeners/blob/master/CONTRIBUTING.md) for more details regarding contributing to this project.

## License

`ydh-fhir-listeners` is licensed under the [MIT](https://github.com/Fdawgs/ydh-fhir-listeners/blob/master/LICENSE) license.
