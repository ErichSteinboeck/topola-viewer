import queryString from 'query-string';
import {useEffect, useRef, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {useNavigate} from 'react-router';
import {
  Button,
  Checkbox,
  Form,
  Header,
  Icon,
  Input,
  Modal,
} from 'semantic-ui-react';
import {analyticsEvent} from '../util/analytics';
import {MenuItem, MenuType} from './menu_item';

interface Props {
  menuType: MenuType;
}

/** Displays and handles the "Open URL" menu. */
export function UrlMenu(props: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const inputRef = useRef<Input>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (dialogOpen) {
      setUrl('');
      setUseProxy(false);
      inputRef.current?.focus();
    }
  }, [dialogOpen]);

  /** Load button clicked in the "Load from URL" dialog. */
  function handleLoad() {
    setDialogOpen(false);
    if (url) {
      analyticsEvent('url_selected');
      navigate({
        pathname: '/view',
        search: queryString.stringify({url, handleCors: String(useProxy)}),
      });
    }
  }

  function loadFromUrlModal() {
    return (
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        centered={false}
      >
        <Header>
          <Icon name="cloud download" />
          <FormattedMessage
            id="load_from_url.title"
            defaultMessage="Load from URL"
          />
        </Header>
        <Modal.Content>
          <Form onSubmit={handleLoad}>
            <Input
              placeholder="https://"
              fluid
              value={url}
              onChange={(_, data) => setUrl(data.value)}
              ref={inputRef}
            />
            <p>
              <FormattedMessage
                id="load_from_url.direct_explanation"
                defaultMessage="Files are normally loaded directly. Use the proxy option only if the source server blocks access from this website (CORS)."
              />
            </p>
            <Form.Field>
              <Checkbox
                label={
                  <FormattedMessage
                    id="load_from_url.use_proxy"
                    defaultMessage="Use CORS proxy (third-party service)"
                  />
                }
                checked={useProxy}
                onChange={(_, data) => setUseProxy(!!data.checked)}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button secondary onClick={() => setDialogOpen(false)}>
            <FormattedMessage
              id="load_from_url.cancel"
              defaultMessage="Cancel"
            />
          </Button>
          <Button primary onClick={handleLoad}>
            <FormattedMessage id="load_from_url.load" defaultMessage="Load" />
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }

  return (
    <>
      <MenuItem onClick={() => setDialogOpen(true)} menuType={props.menuType}>
        <Icon name="cloud download" />
        <FormattedMessage
          id="menu.load_from_url"
          defaultMessage="Load from URL"
        />
      </MenuItem>
      {loadFromUrlModal()}
    </>
  );
}
