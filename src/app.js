import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';

const timeout = 30000;

const state = {
  form: {
    state: 'filling',
    error: '',
  },
  feed: {
    channels: [],
    news: [],
    error: '',
  },
};

const addRSSData = (url, state, data) => {
  const { feed } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  feed.channels = [...feed.channels, {
    url,
    uuid,
    title,
    description,
    id: _.uniqueId('channel_'),
  }];
  feed.news = [...feed.news, { items, uuid, id: _.uniqueId('news_') }];
};

const updateRSSNewsData = (url, state, data) => {
  const { feed } = state;
  const { items } = data;
  const { uuid: urlID } = _.find(feed.channels, (item) => item.url === url);
  const newsToUpdate = _.find(feed.news, (item) => item.uuid === urlID);
  const newNews = _.differenceBy(items, newsToUpdate.items, 'title');
  if (newNews.length !== 0) {
    newsToUpdate.items.unshift(...newNews);
  }
};

const getRSSData = (url, state) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  const { feed, form } = state;
  return axios.get(`${proxy}/${url}`)
    .then((res) => {
      const { data } = res;
      const parsedData = parse(data);
      feed.error = '';
      return parsedData;
    }).catch((error) => {
      if (error.request) {
        feed.error = error.request.status === 0 ? 'network' : 'access';
      } else {
        feed.error = error.type;
      }
      throw new Error(`Network error ${error}`);
    }).finally(() => {
      form.state = 'ready';
    });
};

const updateFeed = (state, url) => getRSSData(url, state)
  .then((data) => {
    updateRSSNewsData(url, state, data);
    setTimeout(() => {
      updateFeed(state, url);
    }, timeout);
  });

const getRSS = (state, url) => getRSSData(url, state)
  .then((data) => {
    addRSSData(url, state, data);
  });

export default () => {
  const elements = {
    form: document.querySelector('#form'),
    input: document.querySelector('#url-address'),
  };

  elements.input.addEventListener('input', (e) => {
    e.preventDefault();
    const { target: { value: url } } = e;
    const { feed: { channels }, form } = state;
    const list = channels.map(({ url }) => url);
    try {
      validate(list, url);
      form.error = '';
      form.state = 'ready';
    } catch ({ type }) {
      form.error = type;
      form.state = 'filling';
    }
  });

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    state.form.state = 'processing';
    getRSS(state, url)
      .then(() => {
        state.form.state = 'finished';
      })
      .then(() => {
        setTimeout(() => {
          updateFeed(state, url);
        }, timeout);
      });
  });

  i18next.init({
    lng: 'en',
    debug: false,
    resources,
  }).then((texts) => {
    render(state, texts);
  });
};
