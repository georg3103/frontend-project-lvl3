import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import resources from './locales';
import parse from './parser';
import render from './render';
import validate from './validator';

const timeout = 30000;

const addRSSData = (url, state, data) => {
  const { feed } = state;
  const { title, description, items } = data;
  const uuid = _.uniqueId();
  feed.channels.push({
    url,
    uuid,
    title,
    description,
    id: _.uniqueId('channel_'),
  });
  feed.news.push({
    items,
    uuid,
    id: _.uniqueId('news_'),
  });
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

const getRSSData = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com';
  return axios.get(`${proxy}/${url}`)
    .then((res) => {
      const { data } = res;
      const parsedData = parse(data);
      return parsedData;
    })
    .catch((error) => {
      let resError;
      if (error.request) {
        resError = error.request.status === 0 ? 'network' : 'access';
      } else {
        resError = error.type;
      }
      throw resError;
    });
};

const updateFeed = (state, url) => getRSSData(url)
  .then((data) => {
    state.form.state = 'ready';
    state.feed.error = '';
    updateRSSNewsData(url, state, data);
    setTimeout(() => {
      updateFeed(state, url);
    }, timeout);
  }).catch((error) => {
    state.feed.error = error;
    setTimeout(() => {
      updateFeed(state, url);
    }, 3000);
    throw new Error(`Network error: ${error}`);
  });

const getRSS = (state, url) => getRSSData(url)
  .then((data) => {
    addRSSData(url, state, data);
  }).catch((error) => {
    state.form.state = 'ready';
    throw error;
  });

export default () => {
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
        setTimeout(() => {
          updateFeed(state, url);
        }, timeout);
      })
      .catch((error) => {
        state.feed.error = error;
        throw new Error(`Network error: ${error}`);
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
