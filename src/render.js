import { watch } from 'melanke-watchjs';

export default (state, texts) => {
  const elements = {
    form: document.querySelector('#form'),
    input: document.querySelector('#url-address'),
    button: document.querySelector('button[type="submit"]'),
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

    const errorElement = document.querySelector('.alert-warning');

    if (errorElement) {
      errorElement.remove();
    }

    if (!error.length) {
      return;
    }

    const translatedMessage = texts(`errors.channel.${error}`);

    const warningMessage = document.createElement('div');
    warningMessage.classList.add('alert', 'alert-warning');
    warningMessage.setAttribute('role', 'alert');
    warningMessage.innerHTML = translatedMessage;
    elements.form.after(warningMessage);
  });

  watch(form, 'error', () => {
    const { error } = form;

    const errorElement = document.querySelector('.invalid-feedback');

    if (errorElement) {
      elements.input.classList.remove('is-invalid');
      errorElement.remove();
    }

    if (error.length === 0) {
      return;
    }

    const translatedMessage = texts(`errors.validation.${error}`);
    console.warn('translatedMessage', texts, translatedMessage);

    const warningMessage = document.createElement('div');
    warningMessage.classList.add('invalid-feedback');
    warningMessage.innerHTML = translatedMessage;
    elements.input.after(warningMessage);
    elements.input.classList.add('is-invalid');
  });

  watch(form, 'state', () => {
    const { state: formState } = form;
    switch (formState) {
      case 'filling':
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
        break;
      case 'finished':
        enableInput();
        clearForm();
        disableButton();
        break;
      default:
        throw new Error(`Unknown form state: '${formState}'!`);
    }
  });
};
