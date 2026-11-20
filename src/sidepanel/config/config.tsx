import {ParsedQuery} from 'query-string';
import {FormattedMessage, useIntl} from 'react-intl';
import {Checkbox, Form, Header, Input, Item} from 'semantic-ui-react';
import {GedcomData} from '../../util/gedcom_util';
import {getPreferredLanguage, setPreferredLanguage} from '../../util/language';
import {DEFAULT_PLACE_DISPLAY_COUNT, PlaceDisplay} from '../../util/place_util';
import {SourceHead} from '../head/head';

export {PlaceDisplay};

export enum ChartColors {
  NO_COLOR,
  COLOR_BY_SEX,
  COLOR_BY_GENERATION,
}

export enum Ids {
  HIDE,
  SHOW,
}

export enum Sex {
  HIDE,
  SHOW,
}

export enum ClickAction {
  DETAILS = 'details',
  FOCUS = 'focus',
}

export interface Config {
  color: ChartColors;
  id: Ids;
  sex: Sex;
  place: PlaceDisplay;
  placeCount: number;
  clickAction: ClickAction;
  showTechnicalFields: boolean;
  alwaysShowEventNotes: boolean;
}

export const DEFALUT_CONFIG: Config = {
  color: ChartColors.COLOR_BY_GENERATION,
  id: Ids.HIDE,
  sex: Sex.SHOW,
  place: PlaceDisplay.FULL,
  placeCount: DEFAULT_PLACE_DISPLAY_COUNT,
  clickAction: ClickAction.DETAILS,
  showTechnicalFields: false,
  alwaysShowEventNotes: false,
};

const COLOR_ARG = new Map<string, ChartColors>([
  ['n', ChartColors.NO_COLOR],
  ['g', ChartColors.COLOR_BY_GENERATION],
  ['s', ChartColors.COLOR_BY_SEX],
]);
const COLOR_ARG_INVERSE = new Map<ChartColors, string>();
COLOR_ARG.forEach((v, k) => COLOR_ARG_INVERSE.set(v, k));

const ID_ARG = new Map<string, Ids>([
  ['h', Ids.HIDE],
  ['s', Ids.SHOW],
]);
const ID_ARG_INVERSE = new Map<Ids, string>();
ID_ARG.forEach((v, k) => ID_ARG_INVERSE.set(v, k));

const SEX_ARG = new Map<string, Sex>([
  ['h', Sex.HIDE],
  ['s', Sex.SHOW],
]);
const SEX_ARG_INVERSE = new Map<Sex, string>();
SEX_ARG.forEach((v, k) => SEX_ARG_INVERSE.set(v, k));

const PLACE_ARG = new Map<string, PlaceDisplay>([
  ['f', PlaceDisplay.FULL],
  ['s', PlaceDisplay.SHORT],
  ['h', PlaceDisplay.HIDE],
]);
const PLACE_ARG_INVERSE = new Map<PlaceDisplay, string>();
PLACE_ARG.forEach((v, k) => PLACE_ARG_INVERSE.set(v, k));

export function argsToConfig(args: ParsedQuery<unknown>): Config {
  const getParam = (name: string) => {
    const value = args[name];
    return typeof value === 'string' ? value : undefined;
  };

  // Keep preferences across reloads and GEDCOM file changes.
  let stored: Record<string, string> = {};
  try {
    if (typeof window !== 'undefined') {
      stored = JSON.parse(
        window.localStorage.getItem('topola-ui-settings') || '{}',
      );
    }
  } catch {
    // Storage is optional.
  }
  const preference = (name: string) => getParam(name) ?? stored[name];
  const placeCount = parseInt(preference('pn') ?? '', 10);
  return {
    color: COLOR_ARG.get(getParam('c') ?? '') ?? DEFALUT_CONFIG.color,
    id: ID_ARG.get(preference('i') ?? '') ?? DEFALUT_CONFIG.id,
    sex: SEX_ARG.get(getParam('s') ?? '') ?? DEFALUT_CONFIG.sex,
    place: PLACE_ARG.get(preference('p') ?? '') ?? DEFALUT_CONFIG.place,
    placeCount: placeCount >= 1 ? placeCount : DEFALUT_CONFIG.placeCount,
    clickAction:
      preference('click') === 'focus' ? ClickAction.FOCUS : ClickAction.DETAILS,
    showTechnicalFields: preference('technical') === 'true',
    alwaysShowEventNotes: preference('notes') === 'always',
  };
}

export function configToArgs(config: Config): ParsedQuery {
  const result: ParsedQuery = {};
  const color = COLOR_ARG_INVERSE.get(config.color);
  if (color) {
    result.c = color;
  }
  const id = ID_ARG_INVERSE.get(config.id);
  if (id) {
    result.i = id;
  }
  const sex = SEX_ARG_INVERSE.get(config.sex);
  if (sex) {
    result.s = sex;
  }
  const place = PLACE_ARG_INVERSE.get(config.place);
  result.p = place ?? 'f';
  result.pn =
    config.place === PlaceDisplay.SHORT &&
    config.placeCount !== DEFALUT_CONFIG.placeCount
      ? String(config.placeCount)
      : null;
  result.click = config.clickAction;
  result.notes = config.alwaysShowEventNotes ? 'always' : 'collapsed';
  result.technical = config.showTechnicalFields ? 'true' : 'false';
  return result;
}

export function ConfigPanel(props: {
  gedcom: GedcomData;
  config: Config;
  onChange: (config: Config) => void;
}) {
  const intl = useIntl();
  return (
    <Form className="details">
      <Item.Group>
        {SourceHead(props.gedcom)}
        <Item>
          <Item.Content>
            <Header sub>Language / Sprache</Header>
            <select
              aria-label="Language / Sprache"
              defaultValue={getPreferredLanguage()}
              onChange={(event) => setPreferredLanguage(event.target.value)}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="bg">Български</option>
              <option value="cs">Čeština</option>
              <option value="fr">Français</option>
              <option value="it">Italiano</option>
              <option value="pl">Polski</option>
              <option value="ru">Русский</option>
              <option value="sv">Svenska</option>
            </select>
          </Item.Content>
        </Item>
        <Item>
          <Item.Content>
            <Header sub>
              <FormattedMessage
                id="config.click_behavior"
                defaultMessage="Click behavior"
              />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                label={intl.formatMessage({
                  id: 'config.invert_click_behavior',
                  defaultMessage: 'Invert click behavior',
                })}
                checked={props.config.clickAction === ClickAction.FOCUS}
                onChange={(_event, data) =>
                  props.onChange({
                    ...props.config,
                    clickAction: data.checked
                      ? ClickAction.FOCUS
                      : ClickAction.DETAILS,
                  })
                }
              />
            </Form.Field>
          </Item.Content>
        </Item>
        <Item>
          <Item.Content>
            <Header sub>
              <FormattedMessage
                id="config.event_notes"
                defaultMessage="Event notes"
              />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                label={intl.formatMessage({
                  id: 'config.always_show_notes',
                  defaultMessage: 'Always show notes below events',
                })}
                checked={props.config.alwaysShowEventNotes}
                onChange={(_event, data) =>
                  props.onChange({
                    ...props.config,
                    alwaysShowEventNotes: !!data.checked,
                  })
                }
              />
            </Form.Field>
            <Header sub>
              <FormattedMessage
                id="config.gedcom_metadata"
                defaultMessage="GEDCOM metadata"
              />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                label={intl.formatMessage({
                  id: 'config.show_identification',
                  defaultMessage: 'Show identification (chart and sidebar)',
                })}
                checked={props.config.id === Ids.SHOW}
                onChange={(_event, data) =>
                  props.onChange({
                    ...props.config,
                    id: data.checked ? Ids.SHOW : Ids.HIDE,
                  })
                }
              />
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                label={intl.formatMessage({
                  id: 'config.show_technical_fields',
                  defaultMessage: 'Show technical fields (RIN, UID, UPD)',
                })}
                checked={props.config.showTechnicalFields}
                onChange={(_event, data) =>
                  props.onChange({
                    ...props.config,
                    showTechnicalFields: !!data.checked,
                  })
                }
              />
            </Form.Field>
          </Item.Content>
        </Item>
        <Item>
          <Item.Content>
            <Header sub>
              <FormattedMessage id="config.colors" defaultMessage="Colors" />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.colors.NO_COLOR"
                    defaultMessage="none"
                  />
                }
                name="chartColors"
                value="none"
                checked={props.config.color === ChartColors.NO_COLOR}
                onClick={() =>
                  props.onChange({
                    ...props.config,
                    color: ChartColors.NO_COLOR,
                  })
                }
              />
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.colors.COLOR_BY_GENERATION"
                    defaultMessage="by generation"
                  />
                }
                name="chartColors"
                value="generation"
                checked={props.config.color === ChartColors.COLOR_BY_GENERATION}
                onClick={() =>
                  props.onChange({
                    ...props.config,
                    color: ChartColors.COLOR_BY_GENERATION,
                  })
                }
              />
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.colors.COLOR_BY_SEX"
                    defaultMessage="by sex"
                  />
                }
                name="chartColors"
                value="gender"
                checked={props.config.color === ChartColors.COLOR_BY_SEX}
                onClick={() =>
                  props.onChange({
                    ...props.config,
                    color: ChartColors.COLOR_BY_SEX,
                  })
                }
              />
            </Form.Field>
          </Item.Content>
        </Item>
        <Item>
          <Item.Content>
            <Header sub>
              <FormattedMessage id="config.sex" defaultMessage="Sex" />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.sex.HIDE"
                    defaultMessage="hide"
                  />
                }
                name="chartSex"
                value="hide"
                checked={props.config.sex === Sex.HIDE}
                onClick={() => props.onChange({...props.config, sex: Sex.HIDE})}
              />
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.sex.SHOW"
                    defaultMessage="show"
                  />
                }
                name="chartSex"
                value="show"
                checked={props.config.sex === Sex.SHOW}
                onClick={() => props.onChange({...props.config, sex: Sex.SHOW})}
              />
            </Form.Field>
          </Item.Content>
        </Item>
        <Item>
          <Item.Content>
            <Header sub>
              <FormattedMessage id="config.places" defaultMessage="Places" />
            </Header>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.places.HIDE"
                    defaultMessage="hide"
                  />
                }
                name="chartPlaces"
                value="hide"
                checked={props.config.place === PlaceDisplay.HIDE}
                onClick={() =>
                  props.onChange({...props.config, place: PlaceDisplay.HIDE})
                }
              />
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.places.SHORT"
                    defaultMessage="short"
                  />
                }
                name="chartPlaces"
                value="short"
                checked={props.config.place === PlaceDisplay.SHORT}
                onClick={() =>
                  props.onChange({...props.config, place: PlaceDisplay.SHORT})
                }
              />
              {props.config.place === PlaceDisplay.SHORT && (
                <div className="place-count-setting">
                  <label htmlFor="placeCount">
                    <FormattedMessage
                      id="config.place_components"
                      defaultMessage="Number of place components"
                    />
                  </label>
                  <Input
                    id="placeCount"
                    type="number"
                    min={1}
                    max={10}
                    size="mini"
                    style={{width: '6em'}}
                    value={props.config.placeCount}
                    onChange={(_e, {value}) => {
                      const n = parseInt(value, 10);
                      if (n >= 1 && n <= 10) {
                        props.onChange({...props.config, placeCount: n});
                      }
                    }}
                  />
                </div>
              )}
            </Form.Field>
            <Form.Field className="no-margin">
              <Checkbox
                radio
                label={
                  <FormattedMessage
                    tagName="label"
                    id="config.places.FULL"
                    defaultMessage="full"
                  />
                }
                name="chartPlaces"
                value="full"
                checked={props.config.place === PlaceDisplay.FULL}
                onClick={() =>
                  props.onChange({...props.config, place: PlaceDisplay.FULL})
                }
              />
            </Form.Field>
          </Item.Content>
        </Item>
      </Item.Group>
    </Form>
  );
}
