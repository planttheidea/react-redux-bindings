import hoistNonReactStatics from 'hoist-non-react-statics';
import {
  createElement,
  forwardRef as forwardReactRef,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { bindActionCreators } from 'redux';
import { useDispatch, useSelector } from '../hooks';
import { isShallowEqual } from '../utils/equality';

import type { ComponentType } from 'react';
import type { AnyAction } from 'redux';
import type { MergeN } from 'ts-essentials';
import type { IsEqual, Selector } from '../types';

interface AnyProps {
  [key: string]: any;
  shouldUpdateWhenStateChanges?: boolean;
}

type SelectorWithOwnProps<State, OwnProps, SelectedState> = (
  state: State,
  ownProps: OwnProps
) => SelectedState;

interface AnyActionCreators {
  [key: string]: (...args: any[]) => AnyAction;
}
type AnyActionCreatorsDynamic<ActionCreators extends AnyActionCreators> =
  () => ActionDispatchers<ActionCreators>;
type AnyActionCreatorsDynamicWithProps<
  ActionCreators extends AnyActionCreators,
  OwnProps
> = (ownProps: OwnProps) => ActionDispatchers<ActionCreators>;
type ActionDispatchers<ActionCreators extends AnyActionCreators> = {
  [Key in keyof ActionCreators]: (
    ...args: Parameters<ActionCreators[Key]>
  ) => void;
};

type MergeProps<
  SelectedStateProps,
  ActionDispatcherProps extends ActionDispatchers<AnyActionCreators>,
  OwnProps,
  MergedProps
> = (
  props: OwnProps,
  actionDispatcherProps: ActionDispatcherProps | undefined,
  selectedStateProps: SelectedStateProps | undefined
) => MergedProps;

interface Options<
  State,
  SelectedStateProps,
  ActionCreators extends AnyActionCreators,
  OwnProps,
  MergedProps
> {
  actionCreators?: ActionCreators;
  areOwnPropsEqual?: IsEqual<OwnProps>;
  areMergedPropsEqual?: IsEqual<MergedProps>;
  areStatePropsEqual?: IsEqual<SelectedStateProps>;
  mergeConnectedProps?: MergeProps<
    SelectedStateProps,
    ActionDispatchers<ActionCreators>,
    OwnProps,
    MergedProps
  >;
  forwardRef?: boolean;
  includeOwnProps?: boolean;
  shouldUpdateWhenStateChanges?: boolean;
  stateSelector?:
    | Selector<State, SelectedStateProps>
    | SelectorWithOwnProps<State, OwnProps, SelectedStateProps>;
}

const EMPTY_PROPS = {};

function defaultMergeProps(
  ownProps: any,
  actionCreators: any,
  selectedStateProps: any
) {
  return Object.assign({}, ownProps, actionCreators, selectedStateProps);
}

function useMemoizedProps<Props>(
  nextProps: Props,
  isEqual: IsEqual<Props>
): Props {
  const prevProps = useRef<Props>(EMPTY_PROPS as Props);
  const props = isEqual(prevProps.current, nextProps)
    ? prevProps.current
    : nextProps;

  useEffect(() => {
    prevProps.current = props;
  }, [props]);

  return props;
}

function useNormalizedOptions<
  OriginalOptions extends Options<any, any, any, any, any>
>(options: OriginalOptions, shouldUpdateFromProps: boolean | undefined) {
  const normalizedOptions = useMemo(
    () =>
      Object.assign({}, options, {
        shouldUpdateWhenStateChanges:
          options.shouldUpdateWhenStateChanges &&
          shouldUpdateFromProps !== false,
      }),
    [shouldUpdateFromProps]
  );

  return normalizedOptions;
}

function useSelectedStatePropsNone<SelectedStateProps>() {
  return EMPTY_PROPS as SelectedStateProps;
}
function useSelectedStatePropsOnly<SelectedStateProps, State>(
  options: Options<any, any, any, any, any>
) {
  return useSelector(
    options.stateSelector as Selector<State, SelectedStateProps>,
    options
  );
}
function useSelectedStatePropsWithOwnProps<SelectedStateProps, State, OwnProps>(
  options: Options<any, any, any, any, any>,
  ownProps: OwnProps
) {
  const composedSelector: Selector<State, SelectedStateProps> = (state) =>
    options.stateSelector!(state, ownProps);

  return useSelector(composedSelector, options);
}
function getUseSelectedStateProps(options: Options<any, any, any, any, any>) {
  if (options.stateSelector) {
    return options.includeOwnProps
      ? useSelectedStatePropsWithOwnProps
      : useSelectedStatePropsOnly;
  }

  return useSelectedStatePropsNone;
}

function useActionCreatorsNone<ActionCreators extends AnyActionCreators>() {
  return EMPTY_PROPS as ActionDispatchers<ActionCreators>;
}
function useActionCreatorsDynamic<
  ActionCreators extends AnyActionCreators,
  _OwnProps,
  ActionCreatorsDynamic extends AnyActionCreatorsDynamic<ActionCreators>
>(actionCreators: ActionCreatorsDynamic): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators(), dispatch) as any,
    [dispatch]
  );

  return boundActionCreators;
}
function useActionCreatorsDynamicWithProps<
  ActionCreators extends AnyActionCreators,
  OwnProps,
  ActionCreatorsDynamicWithProps extends AnyActionCreatorsDynamicWithProps<
    ActionCreators,
    OwnProps
  >
>(
  actionCreators: ActionCreatorsDynamicWithProps,
  ownProps: OwnProps
): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators(ownProps), dispatch) as any,
    [ownProps, dispatch]
  );

  return boundActionCreators;
}
function useActionCreatorsStatic<ActionCreators extends AnyActionCreators>(
  actionCreators: ActionCreators
): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators as any, dispatch),
    [actionCreators, dispatch]
  );

  return boundActionCreators;
}
function getUseActionCreators(options: Options<any, any, any, any, any>) {
  const { actionCreators, includeOwnProps } = options;

  if (actionCreators) {
    if (typeof actionCreators === 'object') {
      return useActionCreatorsStatic;
    }

    if (typeof actionCreators === 'function') {
      return includeOwnProps
        ? useActionCreatorsDynamicWithProps
        : useActionCreatorsDynamic;
    }
  }

  return useActionCreatorsNone;
}

function useMergeConnectedProps<
  SelectedStateProps,
  ActionDispatcherProps extends ActionDispatchers<AnyActionCreators>,
  OwnProps,
  MergedProps
>(
  props: OwnProps,
  actionDispatcherProps: ActionDispatcherProps | undefined,
  selectedStateProps: SelectedStateProps | undefined,
  mergeProps: MergeProps<
    SelectedStateProps,
    ActionDispatcherProps,
    OwnProps,
    MergedProps
  >,
  isEqual: IsEqual<MergedProps>
) {
  const nextMergedProps = mergeProps(
    props,
    actionDispatcherProps,
    selectedStateProps
  );
  const mergedConnectedProps = useMemoizedProps<MergedProps>(
    nextMergedProps,
    isEqual
  );

  return mergedConnectedProps;
}

function createUseConnectedProps<
  State,
  OwnProps extends AnyProps,
  SelectedStateProps extends AnyProps,
  ActionCreators extends AnyActionCreators,
  MergedProps extends MergeN<
    [OwnProps, ActionDispatchers<ActionCreators>, SelectedStateProps]
  >
>({
  actionCreators,
  areMergedPropsEqual = isShallowEqual,
  areOwnPropsEqual = isShallowEqual,
  areStatePropsEqual = isShallowEqual,
  stateSelector,
  mergeConnectedProps = defaultMergeProps,
  includeOwnProps = false,
  shouldUpdateWhenStateChanges = !!stateSelector,
}: Options<State, SelectedStateProps, ActionCreators, OwnProps, MergedProps>) {
  const options: Options<
    State,
    SelectedStateProps,
    ActionCreators,
    OwnProps,
    MergedProps
  > = {
    actionCreators,
    areMergedPropsEqual,
    areStatePropsEqual,
    stateSelector,
    mergeConnectedProps,
    includeOwnProps,
    shouldUpdateWhenStateChanges,
  };
  const useSelectedState = getUseSelectedStateProps(options);
  const useActionCreators: any = getUseActionCreators(options);

  return function useConnectedProps(props: OwnProps) {
    const [ref, remainingProps] = useMemo<[any, OwnProps]>(() => {
      const { __internalRef = null, ...remainingProps } = props;

      return [__internalRef, remainingProps as OwnProps];
    }, [props]);
    const normalizedOptions = useNormalizedOptions(
      options,
      props.shouldUpdateWhenStateChanges
    );

    const ownProps = useMemoizedProps<OwnProps>(
      remainingProps,
      areOwnPropsEqual
    );
    const selectedStateProps = useSelectedState<
      SelectedStateProps,
      State,
      OwnProps
    >(normalizedOptions, ownProps);
    const actionCreatorProps: ActionDispatchers<ActionCreators> =
      useActionCreators(actionCreators!, ownProps);
    const mergedConnectedProps = useMergeConnectedProps<
      SelectedStateProps,
      ActionDispatchers<ActionCreators>,
      OwnProps,
      MergedProps
    >(
      ownProps,
      actionCreatorProps,
      selectedStateProps,
      mergeConnectedProps,
      areMergedPropsEqual
    );

    return [ref, mergedConnectedProps];
  };
}

export function createWithConnectedProps<
  State,
  OwnProps extends AnyProps,
  SelectedStateProps extends AnyProps,
  ActionCreators extends AnyActionCreators = {},
  MergedProps extends MergeN<
    [OwnProps, ActionDispatchers<ActionCreators>, SelectedStateProps]
  > = MergeN<[OwnProps, ActionDispatchers<ActionCreators>, SelectedStateProps]>
>(
  options: Options<
    State,
    SelectedStateProps,
    ActionCreators,
    OwnProps,
    MergedProps
  > = {} as Options<
    State,
    SelectedStateProps,
    ActionCreators,
    OwnProps,
    MergedProps
  >
) {
  const useConnectedProps = createUseConnectedProps(options);

  return function withConnectedProps(
    Component: ComponentType<MergedProps>
  ): ComponentType<OwnProps> {
    const Connected: any = function Connected(props: OwnProps) {
      const [ref, connectedProps] = useConnectedProps(props);

      return useMemo(
        () =>
          createElement(Component, Object.assign({}, connectedProps, { ref })),
        [ref, connectedProps]
      );
    };

    Connected.displayName = `Connected(${
      Component.displayName || Component.name || 'Anonymous'
    })`;

    if (options.forwardRef) {
      const ForwardedConnected = forwardReactRef(
        (props: OwnProps, ref: any = null) => {
          return useMemo(
            () =>
              createElement(
                Connected,
                Object.assign({}, props, { __internalRef: ref })
              ),
            [props, ref]
          );
        }
      ) as unknown as ComponentType<OwnProps>;

      ForwardedConnected.displayName = Connected.displayName;

      return hoistNonReactStatics(ForwardedConnected, Component);
    }

    return hoistNonReactStatics(Connected, Component);
  };
}
