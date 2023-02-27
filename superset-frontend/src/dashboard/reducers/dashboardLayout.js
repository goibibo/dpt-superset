/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  DASHBOARD_ROOT_ID,
  DASHBOARD_GRID_ID,
  NEW_COMPONENTS_SOURCE_ID,
  DASHBOARD_HEADER_ID,
} from '../util/constants';
import componentIsResizable from '../util/componentIsResizable';
import findParentId from '../util/findParentId';
import getComponentWidthFromDrop from '../util/getComponentWidthFromDrop';
import updateComponentParentsList from '../util/updateComponentParentsList';
import findFirstParentContainerId from 'src/dashboard/util/findFirstParentContainer';
import newComponentFactory from '../util/newComponentFactory';
import newEntitiesFromDrop from '../util/newEntitiesFromDrop';
import reorderItem from '../util/dnd-reorder';
import shouldWrapChildInRow from '../util/shouldWrapChildInRow';
import { ROW_TYPE, TAB_TYPE, TABS_TYPE, CHART_TYPE, HEADER_TYPE, MARKDOWN_TYPE } from '../util/componentTypes';
import { ComponentLayouts } from '../util/componentLayouts';
import {
  GRID_DEFAULT_CHART_WIDTH,
  GRID_COLUMN_COUNT,
} from 'src/dashboard/util/constants';
import {
  UPDATE_COMPONENTS,
  UPDATE_COMPONENTS_PARENTS_LIST,
  DELETE_COMPONENT,
  CREATE_COMPONENT,
  MOVE_COMPONENT,
  CREATE_TOP_LEVEL_TABS,
  DELETE_TOP_LEVEL_TABS,
  DASHBOARD_TITLE_CHANGED,
  RESTRUCTURE_COMPONENT, // ...custom_code: new component reducer
} from '../actions/dashboardLayout';

import { HYDRATE_DASHBOARD } from '../actions/hydrate';

export function recursivelyDeleteChildren(
  componentId,
  componentParentId,
  nextComponents,
) {
  // delete child and it's children
  const component = nextComponents?.[componentId];
  if (component) {
    // eslint-disable-next-line no-param-reassign
    delete nextComponents[componentId];

    const { children = [] } = component;
    children?.forEach?.(childId => {
      recursivelyDeleteChildren(childId, componentId, nextComponents);
    });

    const parent = nextComponents?.[componentParentId];
    if (Array.isArray(parent?.children)) {
      // may have been deleted in another recursion
      const componentIndex = parent.children.indexOf(componentId);
      if (componentIndex > -1) {
        const nextChildren = [...parent.children];
        nextChildren.splice(componentIndex, 1);
        // eslint-disable-next-line no-param-reassign
        nextComponents[componentParentId] = {
          ...parent,
          children: nextChildren,
        };
      }
    }
  }
}

const actionHandlers = {
  [HYDRATE_DASHBOARD](state, action) {
    return {
      ...action.data.dashboardLayout.present,
    };
  },

  [UPDATE_COMPONENTS](state, action) {
    const {
      payload: { nextComponents },
    } = action;
    return {
      ...state,
      ...nextComponents,
    };
  },

  [DELETE_COMPONENT](state, action) {
    const {
      payload: { id, parentId },
    } = action;

    if (!parentId || !id || !state[id] || !state[parentId]) return state;

    const nextComponents = { ...state };

    recursivelyDeleteChildren(id, parentId, nextComponents);
    const nextParent = nextComponents[parentId];
    if (nextParent?.type === ROW_TYPE && nextParent?.children?.length === 0) {
      const grandparentId = findParentId({
        childId: parentId,
        layout: nextComponents,
      });
      recursivelyDeleteChildren(parentId, grandparentId, nextComponents);
    }

    return nextComponents;
  },

  [CREATE_COMPONENT](state, action) {
    const {
      payload: { dropResult },
    } = action;

    const newEntities = newEntitiesFromDrop({ dropResult, layout: state });

    return {
      ...state,
      ...newEntities,
    };
  },


// .......RESTRUCTURE COMPONENT
[RESTRUCTURE_COMPONENT](state, action) {
  try {
    const parentId = findFirstParentContainerId(state);
    const parent = state[parentId];
    const {
      payload: { dropResult },
    } = action;
    let newEntities = JSON.parse(JSON.stringify(state));
    let newSlicesContainer;
    let newSlicesContainerWidth = 0;
    const sectionHashMap = {};
    const chartHash = {}; // ...lookup for chart (slice_id: chart_component) [ e.g. 386: {}]
    const grid = {
      children:[],
      id: "GRID_ID",
      parents: ['ROOT_ID'],
      type: "GRID"
    }

    if (dropResult.charts) {
      if (dropResult.experimentDetails) {
        const { name, description, url, treatmentVariant, controlVariant } = dropResult.experimentDetails;

        // ...........new row container creation to insert markdown
        const rowEntitiesContainer = newComponentFactory(
          ROW_TYPE,
          (parent.parents || []).slice(),
          );
        newEntities[rowEntitiesContainer.id] = rowEntitiesContainer;

        // ..... converting data into table format
        const variantValues = ['', ''];
        ([controlVariant, treatmentVariant] || []).forEach((variant,index) => {
          if(variant?.length) {
            variant?.forEach(data => {
              let values = '';
              (data.values || []).forEach(value => {values = values + value + ","});
              variantValues[index] = variantValues[index] +` | ${data.id} | ${data.experimentUid} | ${data.description} | ${data.values} | ${data.percentage} |  \n`;
            })
          }
        });
        const tableHeading = `|<pre>  Variant </pre> | <pre>  Experiment  </pre> | <pre>  Description  </pre> | <pre>   Values    </pre> | <pre>  Percentage  </pre> | `
        const alignStyle = ` | --- |  :---:  | :---: | :---: | :---: | `;

        // ..........creating new markdown component and adding code 
        const markdownEntities = newComponentFactory(
          MARKDOWN_TYPE,
          (parent.parents || []).slice(),
          );

        // ......adding above created markdown into row.
        rowEntitiesContainer.children.push(markdownEntities.id);
        // .....adding markdown in layout/state;
        newEntities[markdownEntities.id] = markdownEntities;
        // .....updating grid chilren to maintain sequence
        grid.children.push(rowEntitiesContainer.id)
        markdownEntities.meta.width = GRID_COLUMN_COUNT;
        markdownEntities.meta.code = `## ${name}
### ${description}

${variantValues[0] ? ` ### Control Variant
${tableHeading}
${alignStyle}
${variantValues[0]}` : '' }
  
${variantValues[1] ? ` ### Treatment Variant
${tableHeading}
${alignStyle}
${variantValues[1]}` : '' }
  
<br />

<br />

Click here to see [Experiment]( ${url} )`;
          
        }

        
      dropResult.charts.forEach(chart => {
        // .......creating sectionHashMap only active charts is added to sectionTitle as key and value as chart list i.e. [sectionTitle]: [charts]
        if(chart?.isActiveOnDashboard && chart?.sectionTitle) {
          const { sectionTitle } = chart
          const id = chart?.variantSliceId ? chart.variantSliceId : chart.slice_id;
          if(!sectionHashMap[sectionTitle]){
            sectionHashMap[sectionTitle] = [{slice_id: id}]
          } else {
            sectionHashMap[sectionTitle].push({slice_id: id})
          }
        } 
      });

       // ........get hashmap of charts with slice id and container/component id
    Object?.keys(state)?.forEach(key => {
      if (key.includes('CHART')) {
        if(state[key]?.meta?.variantSliceId){
          chartHash[state[key]?.meta?.variantSliceId] = state[key];
        } else {
          chartHash[state[key]?.meta?.chartId] = state[key]; // e.g. 386: {}
        }
      }
    });

    // ..........adding container/component details in sectionHashmap
    Object?.keys(sectionHashMap)?.forEach(key => {
      sectionHashMap[key].map(chart => {
        chart.component = chartHash[chart.slice_id]
      })
    });

    // ............creating grid rows and assigning chart into rows & updating grid.
    Object?.keys(sectionHashMap)?.forEach(key => {
    const headerContainer = newComponentFactory(
      HEADER_TYPE,
      (parent.parents || []).slice(),
      );
      headerContainer.meta.text = key;
      newEntities[headerContainer.id] = headerContainer;
      grid.children.push(headerContainer.id);

    // ...........new row component creation
    newSlicesContainer = newComponentFactory(
      ROW_TYPE,
      (parent.parents || []).slice(),
      );
    
    newEntities[newSlicesContainer.id] = newSlicesContainer;
    grid.children.push(newSlicesContainer.id);
    newSlicesContainerWidth = 0;
    let activeRow = newSlicesContainer;

    // ........this check is for if row width is full and new row is required.
    (sectionHashMap[key] ?? []).forEach(chart => {
      if(newSlicesContainerWidth + chart.component.meta.width > GRID_COLUMN_COUNT) {
        let newChartContainer = newComponentFactory(
          ROW_TYPE,
          (parent.parents || []).slice(),
          );
        activeRow = newChartContainer;
        activeRow.children.push(chart.component.id);
        newEntities[activeRow.id] = activeRow;
        grid.children.push(activeRow.id);
        newSlicesContainerWidth = 0;
      } else {
        activeRow.children.push(chart.component.id)
      }
      newSlicesContainerWidth += chart.component.meta.width;
    });
    });

    // .....updating grid with all rows with chart as children;
    newEntities.GRID_ID.children = grid.children;

    // console.log(
    //   '🚀 ~ file: dashboardLayout.js ~ line 102 ~ newEntities',
    //   newEntities,
    // );
    return {
      ...state,
      ...newEntities
    };
    }
  } catch(err){
  console.log("🚀 ~ file: dashboardLayout.js:295 ~ err", err)
  }
},

  [MOVE_COMPONENT](state, action) {
    const {
      payload: { dropResult },
    } = action;
    const { source, destination, dragging } = dropResult;

    if (!source || !destination || !dragging) return state;

    const nextEntities = reorderItem({
      entitiesMap: state,
      source,
      destination,
    });

    if (componentIsResizable(nextEntities[dragging.id])) {
      // update component width if it changed
      const nextWidth =
        getComponentWidthFromDrop({
          dropResult,
          layout: state,
        }) || undefined; // don't set a 0 width
      if ((nextEntities[dragging.id].meta || {}).width !== nextWidth) {
        nextEntities[dragging.id] = {
          ...nextEntities[dragging.id],
          meta: {
            ...nextEntities[dragging.id].meta,
            width: nextWidth,
          },
        };
      }
    }

    // wrap the dragged component in a row depending on destination type
    const wrapInRow = shouldWrapChildInRow({
      parentType: destination.type,
      childType: dragging.type,
    });

    if (wrapInRow) {
      const destinationEntity = nextEntities[destination.id];
      const destinationChildren = destinationEntity.children;
      const newRow = newComponentFactory(ROW_TYPE);
      newRow.children = [destinationChildren[destination.index]];
      newRow.parents = (destinationEntity.parents || []).concat(destination.id);
      destinationChildren[destination.index] = newRow.id;
      nextEntities[newRow.id] = newRow;
    }

    return {
      ...state,
      ...nextEntities,
    };
  },

  [CREATE_TOP_LEVEL_TABS](state, action) {
    const {
      payload: { dropResult },
    } = action;
    const { source, dragging } = dropResult;

    // move children of current root to be children of the dragging tab
    const rootComponent = state[DASHBOARD_ROOT_ID];
    const topLevelId = rootComponent.children[0];
    const topLevelComponent = state[topLevelId];

    if (source.id !== NEW_COMPONENTS_SOURCE_ID) {
      // component already exists
      const draggingTabs = state[dragging.id];
      const draggingTabId = draggingTabs.children[0];
      const draggingTab = state[draggingTabId];

      // move all children except the one that is dragging
      const childrenToMove = [...topLevelComponent.children].filter(
        id => id !== dragging.id,
      );

      return {
        ...state,
        [DASHBOARD_ROOT_ID]: {
          ...rootComponent,
          children: [dragging.id],
        },
        [topLevelId]: {
          ...topLevelComponent,
          children: [],
        },
        [draggingTabId]: {
          ...draggingTab,
          children: [...draggingTab.children, ...childrenToMove],
        },
      };
    }

    // create new component
    const newEntities = newEntitiesFromDrop({ dropResult, layout: state });
    const newEntitiesArray = Object.values(newEntities);
    const tabComponent = newEntitiesArray.find(
      component => component.type === TAB_TYPE,
    );
    const tabsComponent = newEntitiesArray.find(
      component => component.type === TABS_TYPE,
    );

    tabComponent.children = [...topLevelComponent.children];
    newEntities[topLevelId] = { ...topLevelComponent, children: [] };
    newEntities[DASHBOARD_ROOT_ID] = {
      ...rootComponent,
      children: [tabsComponent.id],
    };

    return {
      ...state,
      ...newEntities,
    };
  },

  [DELETE_TOP_LEVEL_TABS](state) {
    const rootComponent = state[DASHBOARD_ROOT_ID];
    const topLevelId = rootComponent.children[0];
    const topLevelTabs = state[topLevelId];

    if (topLevelTabs.type !== TABS_TYPE) return state;

    let childrenToMove = [];
    const nextEntities = { ...state };

    topLevelTabs.children.forEach(tabId => {
      const tabComponent = state[tabId];
      childrenToMove = [...childrenToMove, ...tabComponent.children];
      delete nextEntities[tabId];
    });

    delete nextEntities[topLevelId];

    nextEntities[DASHBOARD_ROOT_ID] = {
      ...rootComponent,
      children: [DASHBOARD_GRID_ID],
    };

    nextEntities[DASHBOARD_GRID_ID] = {
      ...state[DASHBOARD_GRID_ID],
      children: childrenToMove,
    };

    return nextEntities;
  },

  [UPDATE_COMPONENTS_PARENTS_LIST](state) {
    const nextState = {
      ...state,
    };

    updateComponentParentsList({
      currentComponent: nextState[DASHBOARD_ROOT_ID],
      layout: nextState,
    });

    return {
      ...nextState,
    };
  },

  [DASHBOARD_TITLE_CHANGED](state, action) {
    return {
      ...state,
      [DASHBOARD_HEADER_ID]: {
        ...state[DASHBOARD_HEADER_ID],
        meta: {
          ...state[DASHBOARD_HEADER_ID].meta,
          text: action.text,
        },
      },
    };
  },
};

export default function layoutReducer(state = {}, action) {
  if (action.type in actionHandlers) {
    const handler = actionHandlers[action.type];
    return handler(state, action);
  }

  return state;
}
