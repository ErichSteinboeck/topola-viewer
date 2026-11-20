import React, {useEffect, useRef} from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {Search, SearchResultProps} from 'semantic-ui-react';
import {JsonIndi} from 'topola';
import {formatDateOrRange} from '../util/date_util';
import {FulltextResult} from './fulltext_search';
import {
  registerSearchInput,
  unregisterSearchInput,
} from './use_search_shortcut';

const SHORTCUT_INPUT_PROP = {
  'aria-keyshortcuts': '/',
};

function getNameLine(result: FulltextResult) {
  const name = [result.indi.firstName, result.indi.lastName].join(' ').trim();
  if (result.id.length > 8) {
    return name;
  }
  return (
    <>
      {name} <i>({result.id})</i>
    </>
  );
}

function getDescriptionLine(indi: JsonIndi, currentIntl: IntlShape) {
  const birthDate = formatDateOrRange(indi.birth, currentIntl);
  const deathDate = formatDateOrRange(indi.death, currentIntl);
  if (!deathDate) {
    return birthDate;
  }
  return `${birthDate} – ${deathDate}`;
}

function displaySearchResult(
  result: FulltextResult,
  currentIntl: IntlShape,
): SearchResultProps {
  return {
    id: result.id,
    key: result.id,
    title: getNameLine(result),
    description: result.context || getDescriptionLine(result.indi, currentIntl),
  } as SearchResultProps;
}

interface Props {
  results: FulltextResult[];
  mode: 'people' | 'fulltext';
  onModeChange: (mode: 'people' | 'fulltext') => void;
  value: string;
  onSearchChange: (value: string) => void;
  onResultSelect: (id: string) => void;
  hideShortcutHint?: boolean;
}

/** Displays and handles the search box in the top bar. */
export const SearchBar = React.memo(function SearchBar(props: Props) {
  const intl = useIntl();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const input = el.querySelector('input');
    if (input) {
      registerSearchInput(input);
      return () => unregisterSearchInput(input);
    }
  }, []);

  const placeholder =
    props.mode === 'fulltext'
      ? intl.formatMessage({
          id: 'menu.search.fulltext_placeholder',
          defaultMessage: 'Search names, places and notes',
        })
      : props.hideShortcutHint
        ? intl.formatMessage({
            id: 'menu.search.placeholder',
            defaultMessage: 'Search for people',
          })
        : intl.formatMessage({
            id: 'menu.search.placeholder_with_shortcut',
            defaultMessage: "Search for people (press '/')",
          });

  const transformedResults = props.results.map((r) =>
    displaySearchResult(r, intl),
  );

  return (
    <div ref={wrapperRef} className="topola-search-wrapper">
      <select
        className="topola-search-mode"
        aria-label={intl.formatMessage({
          id: 'menu.search.mode',
          defaultMessage: 'Search mode',
        })}
        value={props.mode}
        onChange={(event) =>
          props.onModeChange(event.target.value as 'people' | 'fulltext')
        }
      >
        <option value="people">
          {intl.formatMessage({
            id: 'menu.search.people',
            defaultMessage: 'People',
          })}
        </option>
        <option value="fulltext">
          {intl.formatMessage({
            id: 'menu.search.fulltext',
            defaultMessage: 'Full text',
          })}
        </option>
      </select>
      <Search
        onSearchChange={(_, data) => props.onSearchChange(data.value || '')}
        onResultSelect={(_, data) => props.onResultSelect(data.result.id)}
        results={transformedResults}
        noResultsMessage={intl.formatMessage({
          id: 'menu.search.no_results',
          defaultMessage: 'No results found',
        })}
        placeholder={placeholder}
        selectFirstResult={true}
        value={props.value}
        input={SHORTCUT_INPUT_PROP}
      />
    </div>
  );
});
