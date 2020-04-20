/* eslint-disable no-undef */
import { watch } from 'melanke-watchjs';

const elements = {
  form: document.querySelector('#form'),
  input: document.querySelector('#url-address'),
  button: form.querySelector('button[type="submit"]'),
  container: document.querySelector('.container'),
};


const renderFeedItem = ({ link, title }) => (
  `<li><a href="${link}">${title}</a></li>`
);

const renderFeed = ({
  title, description, items, id,
}) => {
  const feedContainer = document.createElement('div');
  feedContainer.setAttribute('data-key', id);
  feedContainer.innerHTML = `
    <h2>${title}</h2>
    <p>${description}</p>
    <ul>
      ${items.map(renderFeedItem).join('')}
    </ul>
  `;
  elements.container.appendChild(feedContainer);
};

const renderWarning = (message) => {
  const alertContainer = document.createElement('div');
  alertContainer.classList.add('warning__container');
  alertContainer.innerHTML = `
    <div class="alert alert-danger" role="alert">
      ${message}
    </div>
  `;
  elements.container.appendChild(alertContainer);
};

const removeWarning = () => {
  const alerts = document.querySelectorAll('.alert');
  if (alerts) {
    alerts.forEach((alert) => alert.remove());
  }
};

const clearForm = () => {
  elements.form.reset();
};

const disableButton = () => {
  elements.button.disabled = true;
};

const enableButton = () => {
  elements.button.disabled = false;
};

const disableInput = () => {
  elements.input.disabled = true;
};

const enableInput = () => {
  elements.input.disabled = false;
};

export default (state, texts) => {
  const { feed, form } = state;
  watch(feed, ['channels', 'news'], () => {
    const { channels, news } = feed;
    channels.forEach(({
      title, description, uuid, id,
    }) => {
      const channelContainer = document.querySelector(`[data-key=${id}]`);
      if (channelContainer) {
        channelContainer.remove();
      }

      const [{ items }] = news.filter((item) => item.uuid === uuid);

      renderFeed({
        title, description, items, id,
      });
    });
  });

  watch(feed, 'error', () => {
    const { error } = feed;
    renderWarning(texts(`errors.channel.${error}`));
  });

  watch(form, 'error', () => {
    const { error } = form;
    renderWarning(texts(`errors.validation.${error}`));
  });

  watch(form, 'state', () => {
    const { state: formState } = form;
    switch (formState) {
      case 'filling':
        enableInput();
        disableButton();
        break;
      case 'error':
        enableInput();
        disableButton();
        break;
      case 'loading':
        disableInput();
        disableButton();
        break;
      case 'ready':
        enableInput();
        enableButton();
        removeWarning();
        break;
      case 'finished':
        enableInput();
        removeWarning();
        clearForm();
        disableButton();
        break;
      default:
        throw new Error(`Unknown form state: '${formState}'!`);
    }
  });
};
