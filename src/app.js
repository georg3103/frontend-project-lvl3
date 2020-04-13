import axios from 'axios';
import _ from 'lodash';
import { watch } from 'melanke-watchjs';
import parse from './parser';
import validate from './validator';
// constroller

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

const renderFeedItem = ({ link, title }) => {
  return `<li><a href="${link}">${title}</a></li>`;
};

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

const disableButton = () => {
  elements.button.disabled = true;
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

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  rss: {
    urls: [],
    channels: [],
    news: [],
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


const getStream = (state) => (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  axios({
    method: 'get',
    url: `${proxy}/${url}`,
  }).then((res) => {
    const { data } = res;
    const parsedData = parse(data);
    addRSSData(url, state, parsedData);
    console.log(state);
  });
};

const render = (state) => {
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

  watch(form, 'error', () => {
    disableButton();
  });
};

const validateHandler = (state) => (url) => {
  const { rss: { urls }, form } = state;
  const list = urls.map(({ url }) => url);
  try {
    validate(list, url);
  } catch ({ message }) {
    form.error = message;
  }
};

export default () => {
  // const testURL = 'https://ru.hexlet.io/lessons.rss';
  // getStream(testURL);
  render(state);
  onInputChange(validateHandler(state));
  onFormSubmit(getStream(state));
};
