import {useCallback, useMemo} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {IndiInfo} from 'topola';
import {PRIVATE_ID_PREFIX} from '../datasource/wikitree';
import {Config, configToArgs} from '../sidepanel/config/config';
import {analyticsEvent} from '../util/analytics';
import {getArguments, getUrlForArgs} from '../util/url_args';

/**
 * Custom React hook to manage and synchronize URL routing and query parameter state
 * for the genealogy chart workspace.
 */
export function useUrlState() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse all URL arguments memoized on location changes.
  const args = useMemo(() => getArguments(location), [location]);

  /**
   * Helper to update the browser URL query parameters.
   */
  const updateUrl = useCallback(
    (
      newArgs: Record<string, string | (string | null)[] | null | undefined>,
      options?: {replace?: boolean},
    ) => {
      navigate(getUrlForArgs(location, newArgs), options);
    },
    [location, navigate],
  );

  /**
   * Called when the user clicks an individual box in the chart.
   * Updates the browser URL with the new primary individual selection.
   */
  const onSelection = useCallback(
    (selection: IndiInfo) => {
      // Don't allow selecting WikiTree private profiles.
      if (selection.id.startsWith(PRIVATE_ID_PREFIX)) {
        return;
      }
      analyticsEvent('selection_changed');
      updateUrl({
        indi: selection.id,
        gen: String(selection.generation),
        detail: null,
      });
    },
    [updateUrl],
  );

  /**
   * Called when the user shift+clicks an individual box in the chart.
   * Shows the individual in the details pane.
   */
  const onDetailSelection = useCallback(
    (selection: IndiInfo) => {
      updateUrl({
        detail: selection.id,
        sidePanel: 'true',
      });
    },
    [updateUrl],
  );

  /**
   * Toggles the side panel expansion state.
   */
  const onToggleSidePanel = useCallback(() => {
    const newShowSidePanel = !args.showSidePanel;
    updateUrl(
      {
        sidePanel: newShowSidePanel ? 'true' : 'false',
      },
      {replace: true},
    );
  }, [args.showSidePanel, updateUrl]);

  /**
   * Updates the URL parameters based on configuration updates.
   */
  const onConfigChange = useCallback(
    (config: Config) => {
      const preferences = configToArgs(config);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'topola-ui-settings',
            JSON.stringify(
              Object.fromEntries(
                Object.entries(preferences).filter(
                  ([, value]) => typeof value === 'string',
                ),
              ),
            ),
          );
        }
      } catch {
        // The URL continues to work even when browser storage is disabled.
      }
      updateUrl(preferences, {replace: true});
    },
    [updateUrl],
  );

  return {
    args,
    chartType: args.chartType,
    standalone: args.standalone,
    showWikiTreeMenus: args.showWikiTreeMenus,
    freezeAnimation: args.freezeAnimation,
    showSidePanel: args.showSidePanel,
    config: args.config,
    sourceSpec: args.sourceSpec,
    selection: args.selection,
    detail: args.detail,
    updateUrl,
    onSelection,
    onDetailSelection,
    onToggleSidePanel,
    onConfigChange,
  };
}
