import React, { Component } from 'react';
import {
    ziggeoPlayerAttributesPropTypes, ziggeoPlayerEmbeddingEventsPropTypes, ziggeoCommonEmbeddingEventsPropTypes,
    ziggeoPlayerApplicationOptions, reactCustomOptions
} from '../constants';
import { string, bool, arrayOf, func } from 'prop-types';

export default class ZiggeoPlayer extends Component {

    static player;
    static application;
    static previousVideo;

    static propTypes = {
        apiKey:	string.isRequired,
        ...ziggeoPlayerAttributesPropTypes,
        ...ziggeoPlayerEmbeddingEventsPropTypes,
        ...ziggeoCommonEmbeddingEventsPropTypes,
        ...ziggeoPlayerApplicationOptions,
        ...reactCustomOptions
    };

    static defaultProps = {
        // Presentational parameters
        'width': 640,
        'height': 480,
        'picksnapshots': true,
        'theme': 'default',
        'themecolor': 'default',

        // only react related options
        'preventReRenderOnUpdate': true,

        // Default events to no-op
        ...Object.keys(Object.assign(ziggeoPlayerEmbeddingEventsPropTypes, ziggeoCommonEmbeddingEventsPropTypes)).reduce((defaults, event) => {
            defaults[event] = () => {};
            return defaults;
        }, {})
    };

    componentWillMount() {
        try {
            this.initApplication(function(application, context) {
                context.application = application;
            }, this);
        } catch (e) {
            console.warn(e);
        }
    }

    // Trigger when state is changes
    shouldComponentUpdate (nextProps, nextState) {
        const { preventReRenderOnUpdate } = nextProps || true;
        return !preventReRenderOnUpdate;
    }

    // ZiggeoApi.V2.Player requires an existing DOM element to attach to
    // So why we can't use _buildPlayer in componentWillMount
    componentDidMount() {
        this._buildPlayer();
    };

    componentWillUpdate (nextProps, nextState) {
        // set undefined paren onRef call
        this.props.onRef(undefined);

        const oldApiKey = this.props.apiKey;
        const { apiKey } = nextProps;

        // application should be undefined as it's destroyed, inside WillUpdate
        if ( apiKey !== oldApiKey)
            this.player.application.data.set('token', apiKey);
    }

    componentDidUpdate (prevProps, prevState) {
        this.previousVideo = prevProps.video;

        this._buildPlayer();
    }

    componentWillUnmount () {
        // Never add this.application.destroy() !!!
        // Will receive error 'Cannot read property 'urls' of undefined'
        if (this.player)
            if (this.player.application) this.player.destroy();

        this.props.onRef(undefined);
    }

    render() {
        return <div ref={e => { this.element = e ; }} {...this._elementProps}></div>;
    };

    get _applicationOptions () {
        return Object.keys(this.props)
            .filter(k => ziggeoPlayerApplicationOptions[k]).reduce((props, k) => {
                props[k] = this.props[k];
                return props;
            }, {});
    }

    _buildPlayer = () => {
        if (this.player) this.player.destroy();

        this.player = new ZiggeoApi.V2.Player({
            element: this.element,
            attrs: this._ziggeoAttributes
        });
        this.player.activate();

        Object.entries(this._ziggeoEvents).forEach(([event, func]) => {
            this.player.on(event, func);
        });

        this.props.onRef(this);
    };

    _ziggeoEvents = Object.keys(Object.assign(ziggeoPlayerEmbeddingEventsPropTypes, ziggeoCommonEmbeddingEventsPropTypes)).reduce((memo, propName) => {
        const eventName = propName.replace(/([A-Z])/g, '_$1').toLowerCase().slice(3)
            .replace(/(recorder_|player_)/g, '');
        memo[eventName] = (...args) => {
            this.props[propName](...args)
        };
        return memo;
    }, {});

    initApplication (callback, context) {
        const { apiKey, locale, flashUrl } = this.props;

        // Set locale
        if (typeof locale !== "undefined")
            ZiggeoApi.V2.Locale.setLocale(locale);

        // Set external flash player
        if (typeof flashUrl !== "undefined")
            ZiggeoApi.V2.Config.set("flash", flashUrl);

        let application = ZiggeoApi.V2.Application.instanceByToken(apiKey, context._applicationOptions);
        if (application)
            callback(application, context);
        else
            throw new Error("Can't initialize application");
    }

    get _ziggeoAttributes () {
        return Object.keys(this.props).filter(k => ziggeoPlayerAttributesPropTypes[k]).reduce((props, k) => {
            props[k] = this.props[k];
            return props;
        }, {});
    }

    // Props which are not related to Ziggeo
    get _elementProps () {
        return Object.keys(this.props).filter(k => !this.constructor.propTypes[k]).reduce((props, k) => {
            props[k] = this.props[k];
            return props;
        }, {});
    }

    // Delegate ziggeo attrs to the player
    playerInstance = () => this.player;

    // Delegate ziggeo attributes to the player
    get width() { return this.player.width() };
    get height() { return this.player.height() };

    // Delegate ziggeo methods to the player
    play = () => this.player.play();
    pause = () => this.player.pause();
    stop = () => this.player.stop();
    seek = (...args) => this.player.seek(...args);
    set_volume = (...args) => this.player.set_volume(...args);
}
