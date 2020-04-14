/* eslint-disable no-param-reassign */
/* eslint-disable no-shadow */
/* eslint-disable no-undef */
/* eslint-disable func-names */
import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import { watch } from 'melanke-watchjs';
import resources from './locales';
import parse from './parser';
import validate from './validator';

// View

const elements = (function () {
  const input = document.querySelector('#url-address');
  const form = document.querySelector('#form');
  const button = form.querySelector('button[type="submit"]');
  const container = document.querySelector('.container');
  return {
    input,
    form,
    button,
    container,
  };
}());

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

const onFormSubmit = (handler) => {
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    handler(url);
  });
};

const onInputChange = (handler) => {
  elements.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value } } = e;
    handler(value);
  });
};

// Model

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  rss: {
    urls: [],
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { rss } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  rss.urls = [...rss.urls, { url, uuid }];
  rss.channels = [...rss.channels, {
    title,
    description,
    uuid,
    id: _.uniqueId('channel_'),
  }];
  rss.news = [...rss.news, { items, uuid, id: _.uniqueId('news_') }];
};


const render = (state, texts) => {
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
    const { state } = form;
    switch (state) {
      case 'filling':
        disableButton();
        break;
      case 'loading':
        disableButton();
        break;
      case 'error':
        disableButton();
        break;
      case 'ready':
        enableButton();
        removeWarning();
        break;
      default:
        break;
    }
  });
};

const validateHandler = (state) => (url) => {
  const { rss: { urls }, form } = state;
  const list = urls.map(({ url }) => url);
  try {
    validate(list, url);
    form.error = '';
    form.state = 'ready';
  } catch ({ type }) {
    form.error = type;
    form.state = 'filling';
  }
};

const getStream = (state, url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  state.form.state = 'loading';
  return axios({
    method: 'get',
    url: `${proxy}/${url}`,
  }).then((res) => {
    const { data } = res;
    const parsedData = parse(data);
    addRSSData(url, state, parsedData);
  }).catch((error) => {
    state.rss.error = 'network';
    // should check, which error
    state.form.state = 'error';
    throw new Error(error);
  });
};

const formSubmitHandler = (state) => (url) => {
  getStream(state, url)
    .then(() => {
      state.form.state = 'filling';
      clearForm();
    });
};

export default () => {
  onInputChange(validateHandler(state));
  onFormSubmit(formSubmitHandler(state));
  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
