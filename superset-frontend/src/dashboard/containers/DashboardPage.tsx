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
import React, { FC, useEffect, useMemo, useRef } from 'react';
import { Global } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import {
  CategoricalColorNamespace,
  FeatureFlag,
  getSharedLabelColor,
  isFeatureEnabled,
  SharedLabelColorSource,
  t,
  useTheme,
} from '@superset-ui/core';
import pick from 'lodash/pick';
import { useDispatch, useSelector } from 'react-redux';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import Loading from 'src/components/Loading';
import {
  useDashboard,
  useDashboardCharts,
  useDashboardDatasets,
} from 'src/hooks/apiResources';
import {
  hydrateDashboard,
  hydrateExperimentDashboard,
} from 'src/dashboard/actions/hydrate';
import { setDatasources } from 'src/dashboard/actions/datasources';
import injectCustomCss from 'src/dashboard/util/injectCustomCss';
import setupPlugins from 'src/setup/setupPlugins';

import {
  getItem,
  LocalStorageKeys,
  setItem,
} from 'src/utils/localStorageHelpers';
import { URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import { getFilterSets } from 'src/dashboard/actions/nativeFilters';
import {
  setDatasetsStatus,
  addExperimentDetails,
} from 'src/dashboard/actions/dashboardState';
import {
  getFilterValue,
  getPermalinkValue,
} from 'src/dashboard/components/nativeFilters/FilterBar/keyValue';
import { DashboardContextForExplore } from 'src/types/DashboardContextForExplore';
import shortid from 'shortid';
// ........custom_code: import action
import { restructureComponent } from 'src/dashboard/actions/dashboardLayout';
import extractUrlParams from '../util/extractUrlParams';
// import { dashboardResponse } from '../testResponse';
// ..........custom_code:end
import { RootState } from '../types';
import { getActiveFilters } from '../util/activeDashboardFilters';
import { filterCardPopoverStyle, headerStyles } from '../styles';

export const DashboardPageIdContext = React.createContext('');

setupPlugins();
const DashboardContainer = React.lazy(
  () =>
    import(
      /* webpackChunkName: "DashboardContainer" */
      /* webpackPreload: true */
      'src/dashboard/containers/Dashboard'
    ),
);
const regularUrlParams = extractUrlParams('regular');

const originalDocumentTitle = document.title;

type PageProps = {
  idOrSlug: string;
};

const getDashboardContextLocalStorage = () => {
  const dashboardsContexts = getItem(
    LocalStorageKeys.dashboard__explore_context,
    {},
  );
  // A new dashboard tab id is generated on each dashboard page opening.
  // We mark ids as redundant when user leaves the dashboard, because they won't be reused.
  // Then we remove redundant dashboard contexts from local storage in order not to clutter it
  return Object.fromEntries(
    Object.entries(dashboardsContexts).filter(
      ([, value]) => !value.isRedundant,
    ),
  );
};

const updateDashboardTabLocalStorage = (
  dashboardPageId: string,
  dashboardContext: DashboardContextForExplore,
) => {
  const dashboardsContexts = getDashboardContextLocalStorage();
  setItem(LocalStorageKeys.dashboard__explore_context, {
    ...dashboardsContexts,
    [dashboardPageId]: dashboardContext,
  });
};

const useSyncDashboardStateWithLocalStorage = () => {
  const dashboardPageId = useMemo(() => shortid.generate(), []);
  const dashboardContextForExplore = useSelector<
    RootState,
    DashboardContextForExplore
  >(({ dashboardInfo, dashboardState, nativeFilters, dataMask }) => ({
    labelColors: dashboardInfo.metadata?.label_colors || {},
    sharedLabelColors: dashboardInfo.metadata?.shared_label_colors || {},
    colorScheme: dashboardState?.colorScheme,
    chartConfiguration: dashboardInfo.metadata?.chart_configuration || {},
    nativeFilters: Object.entries(nativeFilters.filters).reduce(
      (acc, [key, filterValue]) => ({
        ...acc,
        [key]: pick(filterValue, ['chartsInScope']),
      }),
      {},
    ),
    dataMask,
    dashboardId: dashboardInfo.id,
    filterBoxFilters: getActiveFilters(),
    dashboardPageId,
  }));

  useEffect(() => {
    updateDashboardTabLocalStorage(dashboardPageId, dashboardContextForExplore);
    return () => {
      // mark tab id as redundant when dashboard unmounts - case when user opens
      // Explore in the same tab
      updateDashboardTabLocalStorage(dashboardPageId, {
        ...dashboardContextForExplore,
        isRedundant: true,
      });
    };
  }, [dashboardContextForExplore, dashboardPageId]);
  return dashboardPageId;
};

export const DashboardPage: FC<PageProps> = ({ idOrSlug }: PageProps) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const history = useHistory();
  const dashboardPageId = useSyncDashboardStateWithLocalStorage();
  const { addDangerToast } = useToasts();
  const { result: dashboard, error: dashboardApiError } =
    useDashboard(idOrSlug);
  // .........custom_code: for dynamic charts
  const experimentId = regularUrlParams?.experiment_id; // .........custom_code: get experiment id
  const chartVariants = regularUrlParams?.variants
    ? JSON.parse(regularUrlParams?.variants)
    : [];
  // .........custom_code_end:
  const { result: charts, error: chartsApiError } =
    useDashboardCharts(idOrSlug);
  const {
    result: datasets,
    error: datasetsApiError,
    status,
  } = useDashboardDatasets(idOrSlug);
  const isDashboardHydrated = useRef(false);

  const error = dashboardApiError || chartsApiError;
  const readyToRender = Boolean(dashboard && charts);
  const { dashboard_title, css, metadata, id = 0 } = dashboard || {};

  useEffect(() => {
    // mark tab id as redundant when user closes browser tab - a new id will be
    // generated next time user opens a dashboard and the old one won't be reused
    const handleTabClose = () => {
      const dashboardsContexts = getDashboardContextLocalStorage();
      setItem(LocalStorageKeys.dashboard__explore_context, {
        ...dashboardsContexts,
        [dashboardPageId]: {
          ...dashboardsContexts[dashboardPageId],
          isRedundant: true,
        },
      });
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [dashboardPageId]);

  useEffect(() => {
    dispatch(setDatasetsStatus(status));
  }, [dispatch, status]);

  useEffect(() => {
    // eslint-disable-next-line consistent-return
    async function getDataMaskApplied() {
      const permalinkKey = getUrlParam(URL_PARAMS.permalinkKey);
      const nativeFilterKeyValue = getUrlParam(URL_PARAMS.nativeFiltersKey);
      const isOldRison = getUrlParam(URL_PARAMS.nativeFilters);

      let dataMask = nativeFilterKeyValue || {};
      // activeTabs is initialized with undefined so that it doesn't override
      // the currently stored value when hydrating
      let activeTabs: string[] | undefined;
      if (permalinkKey) {
        const permalinkValue = await getPermalinkValue(permalinkKey);
        if (permalinkValue) {
          ({ dataMask, activeTabs } = permalinkValue.state);
        }
      } else if (nativeFilterKeyValue) {
        dataMask = await getFilterValue(id, nativeFilterKeyValue);
      }
      if (isOldRison) {
        dataMask = isOldRison;
      }

      if (readyToRender) {
        if (!isDashboardHydrated.current) {
          isDashboardHydrated.current = true;
          if (isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS_SET)) {
            // only initialize filterset once
            dispatch(getFilterSets(id));
          }
        }
        dispatch(
          hydrateDashboard({
            history,
            dashboard,
            charts,
            activeTabs,
            dataMask,
          }),
        );
      }
      return null;
    }

    async function getExperimentDataMaskApplied() {
      const permalinkKey = getUrlParam(URL_PARAMS.permalinkKey);
      const nativeFilterKeyValue = getUrlParam(URL_PARAMS.nativeFiltersKey);
      const isOldRison = getUrlParam(URL_PARAMS.nativeFilters);
      // .......custom_code: variables
      const chartList: any = [];
      let data; // to store dashboard charts infor
      let experimentDetails = {};
      const metricsPayload = {
        expId: experimentId,
        // variantId: chartVariants,
        chartRequestMap: {},
      };
      // let metricResult = {};
      // .......custom_code_end: variables

      let dataMask = nativeFilterKeyValue || {};
      // activeTabs is initialized with undefined so that it doesn't override
      // the currently stored value when hydrating
      let activeTabs: string[] | undefined;
      if (permalinkKey) {
        const permalinkValue = await getPermalinkValue(permalinkKey);
        if (permalinkValue) {
          ({ dataMask, activeTabs } = permalinkValue.state);
        }
      } else if (nativeFilterKeyValue) {
        dataMask = await getFilterValue(id, nativeFilterKeyValue);
      }
      if (isOldRison) {
        dataMask = isOldRison;
      }

      if (readyToRender) {
        if (!isDashboardHydrated.current) {
          isDashboardHydrated.current = true;
          if (isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS_SET)) {
            // only initialize filterset once
            dispatch(getFilterSets(id));
          }
        }
        // ................custom_code: call dynamic filter api and append the info in charts formdata
        try {
          console.log('--custom filter');
          // const response = dashboardResponse; // enable for testing
          const response = await fetch(
            `http://10.66.29.210:7070/measurement/experiment/${experimentId}/chart`,
          )
            .then(response => response.json())
            .catch(err => console.log('---api failed', err));
          if (response) {
            data = response?.supersetDashboard;
            // eslint-disable-next-line prefer-destructuring
            experimentDetails = response?.entityDetails;
            dispatch(addExperimentDetails(experimentDetails));
          }

          // .............custom_code:1432... for funnel chart variant
          const vizList = ['funnel', 'time_table', 'funnel_variant'];
          const vizCol = {
            funnel: 'experiment_uid',
            funnel_variant: 'experiment_variant_id',
            time_table: 'experiment_variant_id',
          };
          if (chartVariants?.length) {
            console.info('--- applying variant ---');
            const variants = chartVariants;
            charts?.forEach(chart => {
              if (vizList.includes(chart.form_data.viz_type)) {
                variants.forEach((variant: String, index: Number) => {
                  const newChart = JSON.parse(JSON.stringify(chart));
                  newChart.variantSliceId = `${newChart.form_data.slice_id}_${variant}`;
                  newChart.variantId = variant;
                  newChart.variantIndex = index;
                  newChart.variants = variants;
                  newChart.form_data.variantId = variant;
                  newChart.form_data.variantSliceId = newChart.variantSliceId;
                  newChart.form_data.variantIndex = index;
                  newChart.form_data.custom_filters = {};
                  newChart.form_data.custom_filters.filter = [
                    {
                      col: vizCol[chart.form_data.viz_type],
                      op: '==',
                      val: variant.toString(),
                    },
                  ];
                  charts.push(newChart);
                });
              }
            });
          }

          // .............custom_code_end:1432... for funnel chart variant
          (data || [])?.forEach((section: { charts: any; title: string }) => {
            const chartHash = section?.charts;
            const title = section?.title;
            if (charts?.length && chartHash) {
              charts?.map(chart => {
                const res = chart;
                if (res?.sectionTitle && res.isActiveOnDashboard) {
                  return res;
                }
                res.isActiveOnDashboard = false;
                if (
                  res?.form_data?.slice_id &&
                  chartHash[res?.form_data?.slice_id] &&
                  chart?.form_data?.slice_id
                ) {
                  if (!res.form_data.variantId) {
                    res.form_data.custom_filters =
                      chartHash[chart.form_data.slice_id];
                  } else if (
                    res.form_data.variantId &&
                    chartHash[chart.form_data.slice_id]?.filter?.length
                  ) {
                    res.form_data.custom_filters.filter = [
                      ...res.form_data?.custom_filters?.filter,
                      ...chartHash[chart.form_data.slice_id].filter,
                    ];
                  }
                  res.isActiveOnDashboard = true;
                  res.sectionTitle = title;
                  res.form_data.metricDetails =
                    chartHash[chart.form_data.slice_id]?.metricDetails;
                }
                if (res.isActiveOnDashboard) {
                  chartList.push(res);
                  // ..........add filters in metric payload
                  const { filter, groupBy } = res.form_data.custom_filters;
                  const newSliceKey =
                    res.variantSliceId ?? res.form_data.slice_id;
                  if (newSliceKey) {
                    metricsPayload.chartRequestMap[newSliceKey] = {
                      filter,
                      groupBy,
                    };
                  }
                }
                return res;
              });
            }
          });
        } catch (err) {
          console.log(
            '🚀 ~ file: DashboardPage.tsx ~ line 425 ~ getExperimentDataMaskApplied ~ err',
            err,
          );
        }
        // metricResult = await fetch(
        //   `http://10.66.29.48:8085/reporting/chartData`,
        //   {
        //     method: 'POST',
        //     body: JSON.stringify(metricsPayload),
        //     headers: {
        //       'Content-Type': 'application/json',
        //     },
        //   },
        // )
        //   .then(response => response.json())
        //   .catch(err => console.log('---api failed for chartData', err));

        // if (Object.keys(metricResult?.resultData)?.length) {
        //   (charts ?? []).map(chart => {
        //     if (metricResult?.resultData[chart.form_data.slice_id]) {
        //       chart.form_data.metricData =
        //         metricResult?.resultData[chart.form_data.slice_id];
        //     } else if (
        //       metricResult?.resultData[chart.form_data.variantSliceId]
        //     ) {
        //       chart.form_data.metricData =
        //         metricResult?.resultData[chart.form_data.slice_id];
        //     }
        //     return chart;
        //   });
        // }

        dispatch(
          hydrateExperimentDashboard({
            history,
            dashboard,
            charts,
            activeTabs,
            filterboxMigrationState,
            dataMask,
          }),
        );
      }
      // ............custom_code: to restructure layout on dashboard
      if (experimentId && data?.length && chartList.length) {
        console.log(
          '🚀 ~ file: DashboardPage.tsx ~ line 422 ~ getExperimentDataMaskApplied ~ experimentId',
          experimentId,
          data,
          chartList,
        );
        dispatch(
          restructureComponent({ charts: chartList, experimentDetails }),
        );
      }
      // ............custom_code_end: to restructure layout on dashboard
      return null;
    }
    // .............custom_code_end
    if (experimentId && id) {
      getExperimentDataMaskApplied();
    } else if (id) getDataMaskApplied();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToRender]);

  useEffect(() => {
    if (dashboard_title) {
      document.title = dashboard_title;
    }
    return () => {
      document.title = originalDocumentTitle;
    };
  }, [dashboard_title]);

  useEffect(() => {
    if (typeof css === 'string') {
      // returning will clean up custom css
      // when dashboard unmounts or changes
      return injectCustomCss(css);
    }
    return () => {};
  }, [css]);

  useEffect(() => {
    const sharedLabelColor = getSharedLabelColor();
    sharedLabelColor.source = SharedLabelColorSource.dashboard;
    return () => {
      // clean up label color
      const categoricalNamespace = CategoricalColorNamespace.getNamespace(
        metadata?.color_namespace,
      );
      categoricalNamespace.resetColors();
      sharedLabelColor.clear();
    };
  }, [metadata?.color_namespace]);

  useEffect(() => {
    if (datasetsApiError) {
      addDangerToast(
        t('Error loading chart datasources. Filters may not work correctly.'),
      );
    } else {
      dispatch(setDatasources(datasets));
    }
  }, [addDangerToast, datasets, datasetsApiError, dispatch]);

  if (error) throw error; // caught in error boundary
  if (!readyToRender) return <Loading />;

  return (
    <>
      <Global styles={[filterCardPopoverStyle(theme), headerStyles(theme)]} />
      <DashboardPageIdContext.Provider value={dashboardPageId}>
        <DashboardContainer />
      </DashboardPageIdContext.Provider>
    </>
  );
};

export default DashboardPage;
