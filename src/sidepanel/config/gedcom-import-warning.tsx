import {FormattedMessage} from 'react-intl';
import {Message} from 'semantic-ui-react';
import {GedcomRepairReport} from '../../util/gedcom_repair';

export function GedcomImportWarning({
  repairReport,
}: {
  repairReport?: Omit<GedcomRepairReport, 'text'>;
}) {
  if (!repairReport) {
    return (
      <p className="gedcom-diagnostic-status">
        <FormattedMessage
          id="gedcom.diagnostic_unavailable"
          defaultMessage="GEDCOM check unavailable for this cached import. Reload the original file to run the check."
        />
      </p>
    );
  }
  if (
    !repairReport.repairedLines &&
    !repairReport.unrepairedLines &&
    !repairReport.parserWarnings
  ) {
    return (
      <p className="gedcom-diagnostic-status">
        <FormattedMessage
          id="gedcom.diagnostic_clear"
          defaultMessage="GEDCOM check: No detectable structural or continuation-line issues. This is not a complete validation."
        />
      </p>
    );
  }
  return (
    <>
      {repairReport &&
        (repairReport.repairedLines > 0 ||
          repairReport.unrepairedLines > 0 ||
          repairReport.parserWarnings > 0) && (
          <Message
            warning
            size="small"
            className="gedcom-import-warning"
            role="alert"
          >
            <Message.Header>
              <FormattedMessage
                id="gedcom.repair_warning"
                defaultMessage="GEDCOM import warning"
              />
            </Message.Header>
            {repairReport.repairedLines > 0 && (
              <p>
                <FormattedMessage
                  id="gedcom.lines_repaired"
                  defaultMessage="{count} malformed continuation line(s) automatically repaired."
                  values={{count: repairReport.repairedLines}}
                />
              </p>
            )}
            {repairReport.unrepairedLines > 0 && (
              <p>
                <FormattedMessage
                  id="gedcom.lines_unrepaired"
                  defaultMessage="{count} unrecognized line(s) could not be safely repaired."
                  values={{count: repairReport.unrepairedLines}}
                />
              </p>
            )}
            {repairReport.parserWarnings > 0 && (
              <p>
                <FormattedMessage
                  id="gedcom.parser_warnings"
                  defaultMessage="{count} structural GEDCOM warning(s) detected during parsing."
                  values={{count: repairReport.parserWarnings}}
                />
              </p>
            )}
            <p>
              <FormattedMessage
                id="gedcom.repair_caution"
                defaultMessage="The original file was not modified. Please check the affected notes; automatic reconstruction may be ambiguous."
              />
            </p>
            <p>
              <FormattedMessage
                id="gedcom.repair_line_numbers"
                defaultMessage="Affected lines (first examples): {lines}"
                values={{lines: repairReport.affectedLines.join(', ')}}
              />
            </p>
          </Message>
        )}
    </>
  );
}
