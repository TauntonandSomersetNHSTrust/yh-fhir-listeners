/* eslint-disable quotes */

/**
	Queries database for data needed to build FHIR resource.

	@author Frazer Smith
	@param {string} type - Resource name.
	@param {Object} params - An array of predicates to be added to SQL queries.
	@return {Object} Java ResultSet object.
 */
function buildResourceQuery(type, params) {
	// type is Java object so has to be coerced to a JS object by adding an empty string
	switch (type + '') {
	case 'allergyintolerance':
		return executeCachedQuery("SELECT DISTINCT id, patientReference, allergyGroupDesc, allergyCodingDesc, allergyDrugDesc, allergyDrugGenericDesc, allergyDrugCategoryDesc, allergyDrugFormDesc, allergyDrugIngredientDesc, allergyComment, clinicalStatusCode, verificationStatusCode, typeCode, criticalityCode, CONCAT(COALESCE(assertedDate, ''), 'T', COALESCE(assertedTime, '')) AS assertedDate, CONCAT(COALESCE(lastUpdateDate, ''), 'T', COALESCE(lastUpdateTime, '')) AS lastUpdated FROM OPENQUERY([ENYH-PRD-ANALYTICS], 'SELECT DISTINCT REPLACE(alle.ALG_RowId, ''||'', ''-'') AS id, alle.ALG_PAPMI_ParRef->PAPMI_No AS patientReference, alle.ALG_AllergyGrp_DR->ALGR_Desc AS allergyGroupDesc, alle.ALG_TYPE_DR->ALG_Desc AS allergyCodingDesc, alle.ALG_PHCDM_DR->PHCD_ProductName AS allergyDrugDesc, alle.ALG_PHCGE_DR->PHCGE_Name AS allergyDrugGenericDesc, alle.ALG_PHCSC_DR->PHCSC_Desc AS allergyDrugCategoryDesc, alle.ALG_PHCDRGForm_DR->PHCDF_Description AS allergyDrugFormDesc, alle.ALG_Ingred_DR->INGR_Desc AS allergyDrugIngredientDesc, alle.ALG_Comments AS allergyComment, CASE alle.ALG_Status WHEN ''A'' THEN ''active'' WHEN ''I'' THEN ''inactive'' WHEN ''R'' THEN ''resolved'' ELSE NULL END AS clinicalStatusCode, CASE WHEN alle.ALG_Status = ''C'' THEN ''unconfirmed'' WHEN alle.ALG_ConfirmedDate IS NOT NULL OR (alle.ALG_Status != ''C'' AND alle.ALG_Status IS NOT NULL) THEN ''confirmed'' ELSE ''unconfirmed'' END as verificationStatusCode, CASE alle.ALG_Category_DR->ALRGCAT_DESC WHEN ''ALLERGY'' THEN ''allergy'' WHEN ''SIDEEFFECT'' THEN ''intolerance'' ELSE NULL END AS typeCode, CASE alle.ALG_Severity_DR WHEN 1 THEN ''high'' WHEN 2 THEN ''low'' WHEN 5 THEN ''high'' WHEN 4 THEN ''unable-to-assess'' ELSE NULL END AS criticalityCode, alle.ALG_Date AS assertedDate, alle.ALG_Time AS assertedTime, alle.ALG_LastUpdateDate AS lastUpdateDate, alle.ALG_LastUpdateTime as lastUpdateTime FROM %ALLINDEX PA_Allergy alle WHERE " + params[0] + " AND (alle.ALG_PAPMI_ParRef->PAPMI_No IS NOT NULL)' );");
	case 'condition':
		return executeCachedQuery();
	case 'documentreference':
		return executeCachedQuery();
	case 'encounter':
		return executeCachedQuery("WITH encounter_CTE(encounterIdentifier, encounterClassDesc, encounterClassCode, encounterTypeDesc, encounterTypeCode, encounterPeriodStartDate, encounterPeriodStartTime, encounterPeriodEndDate, encounterPeriodEndTime, subjectReference, encounterStatus, lastUpdateDate, lastUpdateTime) AS (SELECT DISTINCT * FROM OPENQUERY([ENYH-PRD-ANALYTICS], 'SELECT REPLACE(app.APPT_RowId, ''||'', ''-'') AS encounterIdentifier, ''outpatient'' AS encounterClassDesc, NULL AS encounterClassCode, app.APPT_AS_ParRef->AS_RES_ParRef->RES_CTLOC_DR->CTLOC_Desc AS encounterTypeDesc, app.APPT_AS_ParRef->AS_RES_ParRef->RES_CTLOC_DR->CTLOC_Code AS encounterTypeCode, COALESCE(app.APPT_ArrivalDate, app.APPT_DateComp) AS encounterPeriodStartDate, COALESCE(app.APPT_ArrivalTime, app.APPT_TimeComp) AS encounterPeriodStartTime, NULL AS encounterPeriodEndDate, NULL AS encounterPeriodEndTime, app.APPT_Adm_DR->PAADM_PAPMI_DR->PAPMI_No AS subjectReference, app.APPT_Status AS encounterStatus, app.APPT_LastUpdateDate AS lastUpdateDate, NULL AS lastUpdateTime FROM RB_Appointment app WHERE " + params[0] + " AND app.APPT_Adm_DR->PAADM_PAPMI_DR->PAPMI_No IS NOT NULL ') UNION SELECT DISTINCT * FROM OPENQUERY([ENYH-PRD-ANALYTICS], 'SELECT REPLACE(PAADM_ADMNo, ''/'', ''-'') AS encounterIdentifier, CASE PAADM_Type WHEN ''I'' THEN ''inpatient'' WHEN ''E'' THEN ''emergency'' END as encounterClassDesc, CASE PAADM_Type WHEN ''I'' THEN ''IMP'' WHEN ''E'' THEN ''EMER'' END as encounterClassCode, PAADM_DepCode_DR->CTLOC_Desc AS encounterTypeDesc, PAADM_DepCode_DR->CTLOC_Code AS encounterTypeCode, PAADM_AdmDate AS encounterPeriodStartDate, PAADM_AdmTime AS encounterPeriodStartTime, PAADM_DischgDate AS encounterPeriodEndDate, PAADM_DischgTime AS encounterPeriodEndTime, PAADM_PAPMI_DR->PAPMI_No AS subjectReference, PAADM_VisitStatus AS encounterStatus, PAADM_UpdateDate AS lastUpdateDate, PAADM_UpdateTime AS lastUpdateTime FROM PA_Adm WHERE PAADM_Type IN (''I'', ''E'') AND " + params[1] + " AND PAADM_PAPMI_DR->PAPMI_No IS NOT NULL ')) SELECT encounterIdentifier, CASE WHEN encounterStatus IN ('C', 'N', 'X', 'T', 'J', 'H') THEN 'cancelled' WHEN encounterStatus IN ('D', 'R') OR (encounterStatus IN ('A') AND encounterPeriodStartDate IS NOT NULL AND encounterPeriodEndDate IS NOT NULL) THEN 'finished' WHEN (encounterPeriodStartDate > CURRENT_TIMESTAMP AND encounterPeriodStartDate IS NOT NULL) OR encounterStatus IN ('P') THEN 'planned' WHEN encounterStatus IN ('A', 'S', 'W') THEN 'arrived' WHEN encounterPeriodStartDate IS NOT NULL AND encounterPeriodEndDate IS NULL THEN 'in-progress' ELSE 'unknown' END AS encounterStatusMapped, encounterStatus, encounterClassDesc, encounterClassCode, CASE WHEN ISNUMERIC(encounterTypeCode) <> 1 THEN NULL ELSE UPPER(encounterTypeDesc) END AS encounterTypeDesc, CASE WHEN ISNUMERIC(encounterTypeCode) <> 1 THEN NULL ELSE encounterTypeCode END AS encounterTypeCode, CONCAT(COALESCE(encounterPeriodStartDate, ''), 'T', COALESCE(encounterPeriodStartTime, '')) AS encounterPeriodStart, CONCAT(COALESCE(encounterPeriodEndDate, ''), 'T', COALESCE(encounterPeriodEndTime, '')) AS encounterPeriodEnd, subjectReference, CONCAT(COALESCE(lastUpdateDate, ''), 'T', COALESCE(lastUpdateTime, '')) AS lastUpdated FROM encounter_CTE;");
	case 'medicationstatement':
		return executeCachedQuery();
	case 'patient':
		return executeCachedQuery("SELECT DISTINCT nhsNumber, nhsNumberTraceStatusDesc, nhsNumberTraceStatusCode, PatientNo, active, ethnicCategoryDesc, ethnicCategoryCode, homePhone, businessPhone, mobilePhone, appointmentSMS, email, preferredContactMethod, preferredLanguage, interpreterRequired, nameFamily, nameGiven1First, nameGiven2Middle, namePrefix, maritalStatusDesc, maritalStatusCode, addressLine1, addressLine2, city, district, postalCode, LOWER(gender) AS gender, birthdate, deceased, gpDesc, gpAddressLine1, gpAddressLine2, gpCity, gpPostalCode, gpIdentifier, contactName, contactPhone, contactText, dnd.DND, CONCAT(COALESCE(lastUpdateDate, ''), 'T', COALESCE(lastUpdateTime, '')) AS lastUpdated FROM OPENQUERY( [ENYH-PRD-ANALYTICS], 'SELECT DISTINCT patmas.PAPMI_PAPER_DR->PAPER_ID AS nhsNumber, patmas.PAPMI_TraceStatus_DR->TRACE_Desc AS nhsNumberTraceStatusDesc, patmas.PAPMI_TraceStatus_DR AS nhsNumberTraceStatusCode, patmas.PAPMI_No AS PatientNo, patmas.PAPMI_Active, CASE WHEN patmas.PAPMI_Active IS NULL THEN ''true'' WHEN patmas.PAPMI_Active = ''Y'' THEN ''true'' ELSE NULL END AS active, patmas.PAPMI_PAPER_DR->PAPER_IndigStat_DR->INDST_Desc AS ethnicCategoryDesc, patmas.PAPMI_PAPER_DR->PAPER_IndigStat_DR->INDST_Code AS ethnicCategoryCode, patmas.PAPMI_PAPER_DR->PAPER_TelH AS homePhone, patmas.PAPMI_PAPER_DR->PAPER_TelO AS businessPhone, patmas.PAPMI_PAPER_DR->PAPER_MobPhone AS mobilePhone, patmas.PAPMI_PAPER_DR->PAPER_AppointmentSMS AS appointmentSMS, patmas.PAPMI_PAPER_DR->PAPER_Email AS Email, patmas.PAPMI_PAPER_DR->PAPER_PreferredContactMethod AS PreferredContactMethod, patmas.PAPMI_PAPER_DR->PAPER_PrefLanguage_DR->PREFL_Desc AS PreferredLanguage, patmas.PAPMI_PAPER_DR->PAPER_InterpreterRequired AS InterpreterRequired, patmas.PAPMI_PAPER_DR->PAPER_UpdateDate AS lastUpdateDate, patmas.PAPMI_PAPER_DR->PAPER_UpdateTime AS lastUpdateTime, patmas.PAPMI_PAPER_DR->PAPER_Name AS nameFamily, patmas.PAPMI_PAPER_DR->PAPER_Name2 AS nameGiven1First, patmas.PAPMI_PAPER_DR->PAPER_Name3 AS nameGiven2Middle, patmas.PAPMI_PAPER_DR->PAPER_Title_DR->TTL_Desc AS nameprefix, patmas.PAPMI_PAPER_DR->PAPER_NokName AS contactName, patmas.PAPMI_PAPER_DR->PAPER_NokPhone AS contactPhone, patmas.PAPMI_PAPER_DR->PAPER_NokText AS contactText, CASE patmas.PAPMI_PAPER_DR->PAPER_Marital_DR->CTMAR_RowId WHEN 1 THEN ''Married'' WHEN 2 THEN ''unknown'' WHEN 3 THEN ''Widowed'' WHEN 4 THEN ''unmarried'' WHEN 5 THEN ''Legally Seperated'' WHEN 6 THEN ''Divorced'' END AS maritalStatusDesc, CASE patmas.PAPMI_PAPER_DR->PAPER_Marital_DR->CTMAR_Code WHEN ''N'' THEN ''U'' ELSE patmas.PAPMI_PAPER_DR->PAPER_Marital_DR->CTMAR_Code END AS maritalStatusCode, patmas.PAPMI_PAPER_DR->PAPER_StName AS addressLine1, patmas.PAPMI_PAPER_DR->PAPER_ForeignAddress AS addressLine2, patmas.PAPMI_PAPER_DR->PAPER_CityCode_DR->CTCIT_Desc AS city, patmas.PAPMI_PAPER_DR->PAPER_CT_Province_DR->PROV_Desc AS district, patmas.PAPMI_PAPER_DR->PAPER_Zip_DR->CTZIP_Code AS postalCode, CASE patmas.PAPMI_PAPER_DR->PAPER_Sex_DR->CTSEX_RowId WHEN 1 THEN ''female'' WHEN 2 THEN ''unknown'' WHEN 3 THEN ''other'' WHEN 4 THEN ''male'' END AS gender, patmas.PAPMI_DOB AS birthDate, CASE WHEN patmas.PAPMI_PAPER_DR->PAPER_Deceased = ''Y'' THEN ''true'' WHEN patmas.PAPMI_PAPER_DR->PAPER_Deceased = ''N'' THEN NULL END AS deceased, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctor_DR->REFD_Desc AS gpDesc, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctorClinic_DR->CLN_Address1 AS gpAddressLine1, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctorClinic_DR->CLN_Address2 AS gpAddressLine2, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctorClinic_DR->CLN_City_DR->CTCIT_Desc AS gpCity, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctorClinic_DR->CLN_Zip_DR->CTZIP_Code AS gpPostalCode, patmas.PAPMI_PAPER_DR->PAPER_FamilyDoctorClinic_DR->CLN_Code AS gpIdentifier, patmas.PAPMI_VIPFlag AS restrictedPatient FROM %ALLINDEX PA_PatMas patmas WHERE " + params[0] + " AND COALESCE(PAPMI_Active,''Y'') = ''Y'' AND (patmas.PAPMI_PAPER_DR->PAPER_ID IS NOT NULL OR patmas.PAPMI_No IS NOT NULL)') AS patient LEFT JOIN OPENQUERY([ENYH-PRD-ANALYTICS], 'SELECT DISTINCT ALM_PAPMI_ParRef->PAPMI_PAPER_DR->PAPER_ID AS DND FROM PA_AlertMsg WHERE ALM_Alert_DR->ALERT_Desc IN (''Do not disclose patient address'') AND (ALM_ClosedDate IS NULL OR ALM_ClosedDate < CURRENT_TIMESTAMP)') AS dnd ON patient.nhsNumber = dnd.DND;");
	default:
		break;
	}
}
