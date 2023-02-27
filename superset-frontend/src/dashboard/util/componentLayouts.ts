import {
  ROW_TYPE,
  HEADER_TYPE,
  NEW_COMPONENT_SOURCE_TYPE,
  MARKDOWN_TYPE,
} from './componentTypes';

export const ComponentLayouts = {
  header: {
    source: {
      id: 'NEW_COMPONENTS_SOURCE_ID',
      type: NEW_COMPONENT_SOURCE_TYPE,
      index: 0,
    },
    dragging: {
      id: 'NEW_HEADER_ID',
      type: HEADER_TYPE,
      meta: {
        text: 'New header',
        headerSize: 'MEDIUM_HEADER',
        background: 'BACKGROUND_WHITE',
      },
    },
    destination: {
      id: 'GRID_ID',
      type: 'GRID',
      index: 0,
    },
  },
  row: {
    source: {
      id: 'NEW_COMPONENTS_SOURCE_ID',
      type: NEW_COMPONENT_SOURCE_TYPE,
      index: 0,
    },
    dragging: {
      id: 'NEW_ROW_ID',
      type: ROW_TYPE,
    },
    destination: {
      id: 'GRID_ID',
      type: 'GRID',
      index: 0,
    },
  },
  markdown: {
    source: {
      id: 'NEW_COMPONENTS_SOURCE_ID',
      type: NEW_COMPONENT_SOURCE_TYPE,
      index: 0,
    },
    dragging: {
      id: 'NEW_MARKDOWN_ID',
      type: MARKDOWN_TYPE,
      meta: {
        text: 'New header',
        newWidth: 12,
        background: 'BACKGROUND_WHITE',
        height: 40,
        code: `# new markdown`,
        width: 12,
      },
    },
    destination: {
      id: 'GRID_ID',
      type: 'GRID',
      index: 0,
    },
  },
};
