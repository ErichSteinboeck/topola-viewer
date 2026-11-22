import {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Button, Icon, Sidebar, Tab} from 'semantic-ui-react';
import {TopolaData} from '../util/gedcom_util';
import {Config, ConfigPanel} from './config/config';
import {CollapsedDetails} from './details/collapsed-details';
import {Details} from './details/details';

interface SidePanelProps {
  data: TopolaData;
  selectedIndiId: string;
  config: Config;
  onConfigChange: (config: Config) => void;
  expanded: boolean;
  activeTab: number;
  onTabChange: (index: number) => void;
  onToggle: () => void;
}

export function SidePanel({
  data,
  selectedIndiId,
  config,
  onConfigChange,
  expanded,
  activeTab,
  onTabChange,
  onToggle,
}: SidePanelProps) {
  const intl = useIntl();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem('topola-sidebar-width'));
      return saved >= 280 && saved <= 1000 ? saved : 350;
    } catch {
      return 350;
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--topola-sidebar-width',
      sidebarWidth + 'px',
    );
    try {
      window.localStorage.setItem('topola-sidebar-width', String(sidebarWidth));
    } catch {
      // Keep resize functional without localStorage.
    }
  }, [sidebarWidth]);

  function beginResize(event: React.PointerEvent<HTMLDivElement>) {
    if (!expanded || window.innerWidth <= 767) return;
    event.preventDefault();
    const move = (pointer: PointerEvent) => {
      const maxWidth = Math.min(1000, window.innerWidth - 280);
      setSidebarWidth(
        Math.max(280, Math.min(maxWidth, window.innerWidth - pointer.clientX)),
      );
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  function resizeWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? 20 : -20;
    setSidebarWidth((width) =>
      Math.max(
        280,
        Math.min(Math.min(1000, window.innerWidth - 280), width + direction),
      ),
    );
  }

  const tabs = [
    {
      menuItem: intl.formatMessage({
        id: 'tab.details',
        defaultMessage: 'Details',
      }),
      render: () => (
        <Details
          gedcom={data.gedcom}
          indi={selectedIndiId}
          config={config}
          images={data.images}
        />
      ),
    },
    {
      menuItem: intl.formatMessage({
        id: 'tab.settings',
        defaultMessage: 'Settings',
      }),
      render: () => (
        <ConfigPanel
          gedcom={data.gedcom}
          repairReport={data.repairReport}
          config={config}
          onChange={onConfigChange}
        />
      ),
    },
  ];

  return (
    <Sidebar
      id="sidebar"
      animation="overlay"
      icon="labeled"
      width={expanded ? 'wide' : 'very thin'}
      direction="right"
      visible={true}
    >
      {expanded && (
        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-label="Resize information panel"
          aria-orientation="vertical"
          aria-valuemin={280}
          aria-valuemax={1000}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onPointerDown={beginResize}
          onKeyDown={resizeWithKeyboard}
        />
      )}
      {expanded ? (
        <Tab
          id="sideTabs"
          panes={tabs}
          activeIndex={activeTab}
          onTabChange={(_event, data) => {
            if (typeof data.activeIndex === 'number') {
              onTabChange(data.activeIndex);
            }
          }}
        />
      ) : (
        <CollapsedDetails gedcom={data.gedcom} indi={selectedIndiId} />
      )}
      <Button id="sideToggle" icon size="mini" onClick={() => onToggle()}>
        <Icon size="large" name={expanded ? 'arrow right' : 'arrow left'} />
      </Button>
    </Sidebar>
  );
}
