import {FormattedMessage} from 'react-intl';
import {Item, Message} from 'semantic-ui-react';
import {GedcomRepairReport} from '../../util/gedcom_repair';

export function GedcomImportWarning({
  repairReport,
}: {
  repairReport?: Omit<GedcomRepairReport, 'text'>;
}) {
  // A clean or unavailable diagnostic should not clutter the settings pane.
  if (
    !repairReport ||
    (!repairReport.repairedLines &&
      !repairReport.unrepairedLines &&
      !repairReport.parserWarnings)
  ) {
    return null;
  }
  return (
    <Item>
      <Item.Content>
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
      </Item.Content>
    </Item>
  );
}
