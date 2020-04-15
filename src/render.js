/* eslint-disable no-undef */
import { watch } from 'melanke-watchjs';
import ELEMENTS from './elements';


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
  ELEMENTS.container.appendChild(feedContainer);
};

const renderWarning = (message) => {
  const alertContainer = document.createElement('div');
  alertContainer.classList.add('warning__container');
  alertContainer.innerHTML = `
    <div class="alert alert-danger" role="alert">
      ${message}
    </div>
  `;
  ELEMENTS.container.appendChild(alertContainer);
};

const removeWarning = () => {
  const alerts = document.querySelectorAll('.alert');
  if (alerts) {
    alerts.forEach((alert) => alert.remove());
  }
};

const clearForm = () => {
  ELEMENTS.form.reset();
};

const disableButton = () => {
  ELEMENTS.button.disabled = true;
};

const enableButton = () => {
  ELEMENTS.button.disabled = false;
};

export default (state, texts) => {
  const { rss, form } = state;
  watch(rss, 'channels', () => {
    const { channels, news } = rss;
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

  watch(rss, 'error', () => {
    const { error } = rss;
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
        disableButton();
        break;
      case 'error':
        disableButton();
        break;
      case 'ready':
        enableButton();
        removeWarning();
        break;
      case 'finished':
        removeWarning();
        clearForm();
        break;
      default:
        throw new Error('Unsupported form state');
    }
  });
};
