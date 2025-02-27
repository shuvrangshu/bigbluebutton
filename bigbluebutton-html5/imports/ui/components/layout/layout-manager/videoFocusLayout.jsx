import React, { Component } from 'react';
import { throttle, defaultsDeep } from 'lodash';
import LayoutContext from '../context/context';
import DEFAULT_VALUES from '../defaultValues';
import { INITIAL_INPUT_STATE } from '../context/initState';
import { DEVICE_TYPE, ACTIONS, PANELS } from '../enums';

const windowWidth = () => window.document.documentElement.clientWidth;
const windowHeight = () => window.document.documentElement.clientHeight;
const min = (value1, value2) => (value1 <= value2 ? value1 : value2);
const max = (value1, value2) => (value1 >= value2 ? value1 : value2);

class VideoFocusLayout extends Component {
  constructor(props) {
    super(props);

    this.throttledCalculatesLayout = throttle(() => this.calculatesLayout(),
      50, { trailing: true, leading: true });
  }

  componentDidMount() {
    this.init();
    const { newLayoutContextDispatch } = this.props;
    window.addEventListener('resize', () => {
      newLayoutContextDispatch({
        type: ACTIONS.SET_BROWSER_SIZE,
        value: {
          width: window.document.documentElement.clientWidth,
          height: window.document.documentElement.clientHeight,
        },
      });
    });
  }

  shouldComponentUpdate(nextProps) {
    const { newLayoutContextState } = this.props;
    return newLayoutContextState.input !== nextProps.newLayoutContextState.input
      || newLayoutContextState.deviceType !== nextProps.newLayoutContextState.deviceType
      || newLayoutContextState.layoutLoaded !== nextProps.newLayoutContextState.layoutLoaded
      || newLayoutContextState.fontSize !== nextProps.newLayoutContextState.fontSize
      || newLayoutContextState.fullscreen !== nextProps.newLayoutContextState.fullscreen;
  }

  componentDidUpdate(prevProps) {
    const { newLayoutContextState } = this.props;
    const { deviceType } = newLayoutContextState;
    if (prevProps.newLayoutContextState.deviceType !== deviceType) {
      this.init();
    } else {
      this.throttledCalculatesLayout();
    }
  }

  mainWidth() {
    const { newLayoutContextState } = this.props;
    const { layoutLoaded } = newLayoutContextState;
    const wWidth = window.document.documentElement.clientWidth;

    if (layoutLoaded === 'both') return wWidth / 2;
    return wWidth;
  }

  mainHeight() {
    const { newLayoutContextState } = this.props;
    const { layoutLoaded } = newLayoutContextState;
    const wHeight = window.document.documentElement.clientHeight;

    if (layoutLoaded === 'both') return wHeight / 2;
    return wHeight;
  }

  bannerAreaHeight() {
    const { newLayoutContextState } = this.props;
    const { input } = newLayoutContextState;
    const { bannerBar, notificationsBar } = input;

    const bannerHeight = bannerBar.hasBanner ? DEFAULT_VALUES.bannerHeight : 0;
    const notificationHeight = notificationsBar.hasNotification ? DEFAULT_VALUES.bannerHeight : 0;

    return bannerHeight + notificationHeight;
  }

  init() {
    const { newLayoutContextState, newLayoutContextDispatch } = this.props;
    const { input } = newLayoutContextState;
    const { deviceType } = newLayoutContextState;
    if (deviceType === DEVICE_TYPE.MOBILE) {
      newLayoutContextDispatch({
        type: ACTIONS.SET_LAYOUT_INPUT,
        value: defaultsDeep(
          {
            sidebarNavigation: {
              isOpen: false,
              sidebarNavPanel: input.sidebarNavigation.sidebarNavPanel,
            },
            sidebarContent: {
              isOpen: false,
              sidebarContentPanel: input.sidebarContent.sidebarContentPanel,
            },
            SidebarContentHorizontalResizer: {
              isOpen: false,
            },
            presentation: {
              slidesLength: input.presentation.slidesLength,
              currentSlide: {
                ...input.presentation.currentSlide,
              },
            },
            cameraDock: {
              numCameras: input.cameraDock.numCameras,
            },
          },
          INITIAL_INPUT_STATE,
        ),
      });
    } else {
      const { sidebarContentPanel } = input.sidebarContent;

      newLayoutContextDispatch({
        type: ACTIONS.SET_LAYOUT_INPUT,
        value: defaultsDeep(
          {
            sidebarNavigation: {
              isOpen: true,
            },
            sidebarContent: {
              isOpen: sidebarContentPanel !== PANELS.NONE
              && (deviceType === DEVICE_TYPE.TABLET_LANDSCAPE
                || deviceType === DEVICE_TYPE.DESKTOP),
              sidebarContentPanel,
            },
            SidebarContentHorizontalResizer: {
              isOpen: false,
            },
            presentation: {
              slidesLength: input.presentation.slidesLength,
              currentSlide: {
                ...input.presentation.currentSlide,
              },
            },
            cameraDock: {
              numCameras: input.cameraDock.numCameras,
            },
          },
          INITIAL_INPUT_STATE,
        ),
      });
    }
    this.throttledCalculatesLayout();
  }

  reset() {
    this.init();
  }

  calculatesNavbarBounds(mediaAreaBounds) {
    const { newLayoutContextState } = this.props;
    const { layoutLoaded } = newLayoutContextState;

    let top = 0;
    if (layoutLoaded === 'both') top = this.mainHeight();
    else top = DEFAULT_VALUES.navBarTop + this.bannerAreaHeight();

    return {
      width: this.mainWidth() - mediaAreaBounds.left,
      height: DEFAULT_VALUES.navBarHeight,
      top,
      left: mediaAreaBounds.left,
      zIndex: 1,
    };
  }

  calculatesActionbarBounds(mediaAreaBounds) {
    const { newLayoutContextState } = this.props;
    const { input, fontSize } = newLayoutContextState;

    const BASE_FONT_SIZE = 16;
    const actionBarHeight = (DEFAULT_VALUES.actionBarHeight / BASE_FONT_SIZE) * fontSize;

    return {
      display: input.actionBar.hasActionBar,
      width: this.mainWidth() - mediaAreaBounds.left,
      height: actionBarHeight,
      top: this.mainHeight() - actionBarHeight,
      left: mediaAreaBounds.left,
      zIndex: 1,
    };
  }

  calculatesSidebarNavWidth() {
    const { newLayoutContextState } = this.props;
    const { deviceType, input } = newLayoutContextState;
    const {
      sidebarNavMinWidth,
      sidebarNavMaxWidth,
    } = DEFAULT_VALUES;
    let minWidth = 0;
    let width = 0;
    let maxWidth = 0;
    if (input.sidebarNavigation.isOpen) {
      if (deviceType === DEVICE_TYPE.MOBILE) {
        minWidth = this.mainWidth();
        width = this.mainWidth();
        maxWidth = this.mainWidth();
      } else {
        if (input.sidebarNavigation.width === 0) {
          width = min(max((this.mainWidth() * 0.2), sidebarNavMinWidth), sidebarNavMaxWidth);
        } else {
          width = min(max(input.sidebarNavigation.width, sidebarNavMinWidth), sidebarNavMaxWidth);
        }
        minWidth = sidebarNavMinWidth;
        maxWidth = sidebarNavMaxWidth;
      }
    }
    return {
      minWidth,
      width,
      maxWidth,
    };
  }

  calculatesSidebarNavHeight() {
    const { newLayoutContextState } = this.props;
    const { deviceType, input } = newLayoutContextState;
    let sidebarNavHeight = 0;
    if (input.sidebarNavigation.isOpen) {
      if (deviceType === DEVICE_TYPE.MOBILE) {
        sidebarNavHeight = this.mainHeight() - DEFAULT_VALUES.navBarHeight;
      } else {
        sidebarNavHeight = this.mainHeight();
      }
      sidebarNavHeight -= this.bannerAreaHeight();
    }
    return sidebarNavHeight;
  }

  calculatesSidebarNavBounds() {
    const { newLayoutContextState } = this.props;
    const { deviceType, layoutLoaded } = newLayoutContextState;
    const { sidebarNavTop, navBarHeight, sidebarNavLeft } = DEFAULT_VALUES;

    let top = 0;
    if (layoutLoaded === 'both') top = this.mainHeight();
    else top = sidebarNavTop + this.bannerAreaHeight();

    if (deviceType === DEVICE_TYPE.MOBILE) top = navBarHeight + this.bannerAreaHeight();

    return {
      top,
      left: sidebarNavLeft,
      zIndex: deviceType === DEVICE_TYPE.MOBILE ? 10 : 2,
    };
  }

  calculatesSidebarContentWidth() {
    const { newLayoutContextState } = this.props;
    const { deviceType, input } = newLayoutContextState;
    const {
      sidebarContentMinWidth,
      sidebarContentMaxWidth,
    } = DEFAULT_VALUES;
    let minWidth = 0;
    let width = 0;
    let maxWidth = 0;
    if (input.sidebarContent.isOpen) {
      if (deviceType === DEVICE_TYPE.MOBILE) {
        minWidth = this.mainWidth();
        width = this.mainWidth();
        maxWidth = this.mainWidth();
      } else {
        if (input.sidebarContent.width === 0) {
          width = min(
            max((this.mainWidth() * 0.2), sidebarContentMinWidth), sidebarContentMaxWidth,
          );
        } else {
          width = min(max(input.sidebarContent.width, sidebarContentMinWidth),
            sidebarContentMaxWidth);
        }
        minWidth = sidebarContentMinWidth;
        maxWidth = sidebarContentMaxWidth;
      }
    }
    return {
      minWidth,
      width,
      maxWidth,
    };
  }

  calculatesSidebarContentHeight() {
    const { newLayoutContextState } = this.props;
    const { deviceType, input, output } = newLayoutContextState;
    const { sidebarContentMinHeight } = DEFAULT_VALUES;
    const { sidebarContent: inputContent } = input;
    const { sidebarContent: outputContent } = output;
    let minHeight = 0;
    let height = 0;
    let maxHeight = 0;
    if (inputContent.isOpen) {
      if (deviceType === DEVICE_TYPE.MOBILE) {
        height = this.mainHeight() - DEFAULT_VALUES.navBarHeight - this.bannerAreaHeight();
        minHeight = this.mainHeight() - this.bannerAreaHeight();
        maxHeight = this.mainHeight() - this.bannerAreaHeight();
      } else {
        if (input.cameraDock.numCameras > 0) {
          if (inputContent.height > 0 && inputContent.height < this.mainHeight()) {
            height = inputContent.height - this.bannerAreaHeight();
            maxHeight = this.mainHeight() - this.bannerAreaHeight();
          } else {
            const { size: slideSize } = input.presentation.currentSlide;
            const calculatedHeight = (slideSize.height * outputContent.width) / slideSize.width;
            height = this.mainHeight() - calculatedHeight - this.bannerAreaHeight();
            maxHeight = height;
          }
        } else {
          height = this.mainHeight() - this.bannerAreaHeight();
          maxHeight = height;
        }
        minHeight = sidebarContentMinHeight;
      }
    }
    return {
      minHeight,
      height,
      maxHeight,
    };
  }

  calculatesSidebarContentBounds(sidebarNavWidth) {
    const { newLayoutContextState } = this.props;
    const { deviceType, layoutLoaded } = newLayoutContextState;
    const { sidebarNavTop, navBarHeight } = DEFAULT_VALUES;

    let top = 0;
    if (layoutLoaded === 'both') top = this.mainHeight();
    else top = sidebarNavTop + this.bannerAreaHeight();

    if (deviceType === DEVICE_TYPE.MOBILE) top = navBarHeight + this.bannerAreaHeight();

    return {
      top,
      left: deviceType === DEVICE_TYPE.MOBILE
        || deviceType === DEVICE_TYPE.TABLET_PORTRAIT ? 0 : sidebarNavWidth,
      zIndex: deviceType === DEVICE_TYPE.MOBILE ? 11 : 1,
    };
  }

  calculatesMediaAreaBounds(sidebarNavWidth, sidebarContentWidth) {
    const { newLayoutContextState } = this.props;
    const { deviceType, input, layoutLoaded } = newLayoutContextState;
    const { sidebarContent } = input;
    const { navBarHeight, actionBarHeight } = DEFAULT_VALUES;
    let left = 0;
    let width = 0;
    let top = 0;
    if (deviceType === DEVICE_TYPE.MOBILE) {
      left = 0;
      width = this.mainWidth();
    } else if (deviceType === DEVICE_TYPE.TABLET_PORTRAIT) {
      if (sidebarContent.isOpen) {
        left = sidebarContentWidth;
        width = this.mainWidth() - sidebarContentWidth;
      } else {
        left = sidebarNavWidth;
        width = this.mainWidth() - sidebarNavWidth;
      }
    } else {
      left = sidebarNavWidth + sidebarContentWidth;
      width = this.mainWidth() - sidebarNavWidth - sidebarContentWidth;
    }

    if (layoutLoaded === 'both') top = this.mainHeight() / 2;
    else top = navBarHeight + this.bannerAreaHeight();

    return {
      width,
      height: this.mainHeight() - (navBarHeight + actionBarHeight + this.bannerAreaHeight()),
      top,
      left,
    };
  }

  calculatesCameraDockBounds(mediaAreaBounds) {
    const { newLayoutContextState } = this.props;
    const { deviceType, input, fullscreen } = newLayoutContextState;
    const { cameraDock } = input;
    const { numCameras } = cameraDock;

    const cameraDockBounds = {};

    if (numCameras > 0) {
      if (deviceType === DEVICE_TYPE.MOBILE) {
        cameraDockBounds.minHeight = mediaAreaBounds.height * 0.7;
        cameraDockBounds.height = mediaAreaBounds.height * 0.7;
        cameraDockBounds.maxHeight = mediaAreaBounds.height * 0.7;
      } else {
        cameraDockBounds.minHeight = mediaAreaBounds.height;
        cameraDockBounds.height = mediaAreaBounds.height;
        cameraDockBounds.maxHeight = mediaAreaBounds.height;
      }

      cameraDockBounds.top = DEFAULT_VALUES.navBarHeight;
      cameraDockBounds.left = mediaAreaBounds.left;
      cameraDockBounds.minWidth = mediaAreaBounds.width;
      cameraDockBounds.width = mediaAreaBounds.width;
      cameraDockBounds.maxWidth = mediaAreaBounds.width;
      cameraDockBounds.zIndex = 1;

      if (fullscreen.group === 'webcams') {
        cameraDockBounds.width = windowWidth();
        cameraDockBounds.minWidth = windowWidth();
        cameraDockBounds.maxWidth = windowWidth();
        cameraDockBounds.height = windowHeight();
        cameraDockBounds.minHeight = windowHeight();
        cameraDockBounds.maxHeight = windowHeight();
        cameraDockBounds.top = 0;
        cameraDockBounds.left = 0;
        cameraDockBounds.zIndex = 99;
      }

      return cameraDockBounds;
    }

    cameraDockBounds.top = 0;
    cameraDockBounds.left = 0;
    cameraDockBounds.minWidth = 0;
    cameraDockBounds.width = 0;
    cameraDockBounds.maxWidth = 0;
    cameraDockBounds.zIndex = 0;
    return cameraDockBounds;
  }

  calculatesMediaBounds(
    mediaAreaBounds,
    cameraDockBounds,
    sidebarNavWidth,
    sidebarContentWidth,
    sidebarContentHeight,
  ) {
    const { newLayoutContextState } = this.props;
    const { deviceType, input, fullscreen } = newLayoutContextState;
    const mediaBounds = {};
    const { element: fullscreenElement } = fullscreen;

    if (fullscreenElement === 'Presentation' || fullscreenElement === 'Screenshare') {
      mediaBounds.width = this.mainWidth();
      mediaBounds.height = this.mainHeight();
      mediaBounds.top = 0;
      mediaBounds.left = 0;
      mediaBounds.zIndex = 99;
      return mediaBounds;
    }

    if (deviceType === DEVICE_TYPE.MOBILE) {
      mediaBounds.height = mediaAreaBounds.height - cameraDockBounds.height;
      mediaBounds.left = mediaAreaBounds.left;
      mediaBounds.top = mediaAreaBounds.top + cameraDockBounds.height;
      mediaBounds.width = mediaAreaBounds.width;
    } else if (input.cameraDock.numCameras > 0) {
      mediaBounds.height = this.mainHeight() - sidebarContentHeight;
      mediaBounds.left = sidebarNavWidth;
      mediaBounds.top = sidebarContentHeight;
      mediaBounds.width = sidebarContentWidth;
      mediaBounds.zIndex = 1;
    } else {
      mediaBounds.height = mediaAreaBounds.height;
      mediaBounds.width = mediaAreaBounds.width;
      mediaBounds.top = DEFAULT_VALUES.navBarHeight + this.bannerAreaHeight();
      mediaBounds.left = mediaAreaBounds.left;
      mediaBounds.zIndex = 1;
    }

    return mediaBounds;
  }

  calculatesLayout() {
    const { newLayoutContextState, newLayoutContextDispatch } = this.props;
    const { deviceType, input } = newLayoutContextState;

    const sidebarNavWidth = this.calculatesSidebarNavWidth();
    const sidebarNavHeight = this.calculatesSidebarNavHeight();
    const sidebarContentWidth = this.calculatesSidebarContentWidth();
    const sidebarNavBounds = this.calculatesSidebarNavBounds(
      sidebarNavWidth.width, sidebarContentWidth.width,
    );
    const sidebarContentBounds = this.calculatesSidebarContentBounds(
      sidebarNavWidth.width, sidebarContentWidth.width,
    );
    const mediaAreaBounds = this.calculatesMediaAreaBounds(
      sidebarNavWidth.width, sidebarContentWidth.width,
    );
    const navbarBounds = this.calculatesNavbarBounds(mediaAreaBounds);
    const actionbarBounds = this.calculatesActionbarBounds(mediaAreaBounds);
    const cameraDockBounds = this.calculatesCameraDockBounds(mediaAreaBounds);
    const sidebarContentHeight = this.calculatesSidebarContentHeight();
    const mediaBounds = this.calculatesMediaBounds(
      mediaAreaBounds,
      cameraDockBounds,
      sidebarNavWidth.width,
      sidebarContentWidth.width,
      sidebarContentHeight.height,
    );
    const isBottomResizable = input.cameraDock.numCameras > 0;

    newLayoutContextDispatch({
      type: ACTIONS.SET_NAVBAR_OUTPUT,
      value: {
        display: input.navBar.hasNavBar,
        width: navbarBounds.width,
        height: navbarBounds.height,
        top: navbarBounds.top,
        left: navbarBounds.left,
        tabOrder: DEFAULT_VALUES.navBarTabOrder,
        zIndex: navbarBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_ACTIONBAR_OUTPUT,
      value: {
        display: input.actionBar.hasActionBar,
        width: actionbarBounds.width,
        height: actionbarBounds.height,
        top: actionbarBounds.top,
        left: actionbarBounds.left,
        tabOrder: DEFAULT_VALUES.actionBarTabOrder,
        zIndex: actionbarBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_OUTPUT,
      value: {
        display: input.sidebarNavigation.isOpen,
        minWidth: sidebarNavWidth.minWidth,
        width: sidebarNavWidth.width,
        maxWidth: sidebarNavWidth.maxWidth,
        height: sidebarNavHeight,
        top: sidebarNavBounds.top,
        left: sidebarNavBounds.left,
        tabOrder: DEFAULT_VALUES.sidebarNavTabOrder,
        isResizable: deviceType !== DEVICE_TYPE.MOBILE
          && deviceType !== DEVICE_TYPE.TABLET,
        zIndex: sidebarNavBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_RESIZABLE_EDGE,
      value: {
        top: false,
        right: true,
        bottom: false,
        left: false,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_OUTPUT,
      value: {
        display: input.sidebarContent.isOpen,
        minWidth: sidebarContentWidth.minWidth,
        width: sidebarContentWidth.width,
        maxWidth: sidebarContentWidth.maxWidth,
        minHeight: sidebarContentHeight.minHeight,
        height: sidebarContentHeight.height,
        maxHeight: sidebarContentHeight.maxHeight,
        top: sidebarContentBounds.top,
        left: sidebarContentBounds.left,
        currentPanelType: input.currentPanelType,
        tabOrder: DEFAULT_VALUES.sidebarContentTabOrder,
        isResizable: deviceType !== DEVICE_TYPE.MOBILE
          && deviceType !== DEVICE_TYPE.TABLET,
        zIndex: sidebarContentBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_RESIZABLE_EDGE,
      value: {
        top: false,
        right: true,
        bottom: isBottomResizable,
        left: false,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_MEDIA_AREA_SIZE,
      value: {
        width: mediaAreaBounds.width,
        height: mediaAreaBounds.height,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_CAMERA_DOCK_OUTPUT,
      value: {
        display: input.cameraDock.numCameras > 0,
        minWidth: cameraDockBounds.minWidth,
        width: cameraDockBounds.width,
        maxWidth: cameraDockBounds.maxWidth,
        minHeight: cameraDockBounds.minHeight,
        height: cameraDockBounds.height,
        maxHeight: cameraDockBounds.maxHeight,
        top: cameraDockBounds.top,
        left: cameraDockBounds.left,
        tabOrder: 4,
        isDraggable: false,
        resizableEdge: {
          top: false,
          right: false,
          bottom: false,
          left: false,
        },
        zIndex: cameraDockBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_PRESENTATION_OUTPUT,
      value: {
        display: input.presentation.isOpen,
        width: mediaBounds.width,
        height: mediaBounds.height,
        top: mediaBounds.top,
        left: mediaBounds.left,
        tabOrder: DEFAULT_VALUES.presentationTabOrder,
        isResizable: deviceType !== DEVICE_TYPE.MOBILE
          && deviceType !== DEVICE_TYPE.TABLET,
        zIndex: mediaBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_PRESENTATION_RESIZABLE_EDGE,
      value: {
        top: true,
        right: false,
        bottom: false,
        left: false,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_SCREEN_SHARE_OUTPUT,
      value: {
        width: mediaBounds.width,
        height: mediaBounds.height,
        top: mediaBounds.top,
        left: mediaBounds.left,
        zIndex: mediaBounds.zIndex,
      },
    });

    newLayoutContextDispatch({
      type: ACTIONS.SET_EXTERNAL_VIDEO_OUTPUT,
      value: {
        width: mediaBounds.width,
        height: mediaBounds.height,
        top: mediaBounds.top,
        left: mediaBounds.left,
      },
    });
  }

  render() {
    return <></>;
  }
}

export default LayoutContext.withConsumer(VideoFocusLayout);
