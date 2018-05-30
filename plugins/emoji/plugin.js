/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* jshint -W100 */

( function() {
	'use strict';

	CKEDITOR.plugins.add( 'emoji', {
		requires: 'autocomplete,textmatch,ajax',
		beforeInit: function( editor ) {
			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 9 ) {
				return;
			}

			CKEDITOR.ajax.load( CKEDITOR.getUrl( 'plugins/emoji/emoji.json' ), function( data ) {
				var defaultEmojiList = JSON.parse( data );

				if ( !editor._.emojiList ) {
					editor._.emojiList = defaultEmojiList;
				}
				var emoji = editor._.emojiList,
					forbiddenScope = editor.config.emoji_blacklistedElements || [ 'pre', 'code' ],
					charactersToStart = editor.config.emoji_minChars || 2;

				var filter = new CKEDITOR.htmlParser.filter( {
					text: function( value, element ) {
						var preventEmojiConversion = element.getAscendant( hasForbiddenParent );
						if ( preventEmojiConversion ) {
							return value;
						}
						var hits = value.match( /:[a-zA-Z_-]+?:/g );
						if ( hits ) {
							for ( var i = 0; i < hits.length; i++ ) {
								var item = emoji.find( function( element ) {
									return element.id === hits[ i ];
								} );
								if ( item ) {
									value = value.replace( item.id, item.symbol );
								}
							}
						}
						return value;
					}
				} );

				editor.on( 'instanceReady', function() {
					var emoji = new CKEDITOR.plugins.autocomplete( editor, getTextTestCallback(), dataCallback );

					emoji.view.itemTemplate = new CKEDITOR.template( '<li data-id="{id}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{symbol} {id}</li>' );
					emoji.getHtmlToInsert = function( item ) {
						return item.symbol;
					};

				} );

				editor.on( 'toHtml', function( evt ) {
					var sel = evt.editor.getSelection();
					// We want to prevent embedding emoji inside wrong context, e.g. paste :emoji: inside <pre>
					if ( sel && !isEmojiAllowed( sel.getRanges()[ 0 ] ) ) {
						return;
					}

					filter.applyTo( evt.data.dataValue );
				} );

				var html = CKEDITOR.htmlParser.fragment.fromHtml( editor.getData() );
				var writer = new CKEDITOR.htmlParser.basicWriter();

				filter.applyTo( html );
				html.writeHtml( writer );

				if ( editor.status !== 'ready' ) {
					editor.once( 'instanceReady', function() {
						editor.editable().setHtml( writer.getHtml() );
					} );
				} else {
					editor.editable().setHtml( writer.getHtml() );
				}

				function getTextTestCallback() {
					return function( range ) {
						if ( !range.collapsed || !isEmojiAllowed( range ) ) {
							return null;
						}
						return CKEDITOR.plugins.textMatch.match( range, matchCallback );
					};
				}

				function matchCallback( text, offset ) {
					var left = text.slice( 0, offset ),
						match = left.match( new RegExp( ':\\S{' + charactersToStart + '}\\S*$' ) );

					if ( !match ) {
						return null;
					}

					return { start: match.index, end: offset };
				}

				function dataCallback( query, range, callback ) {
					var data = CKEDITOR.tools.array.filter( emoji, function( item ) {
						return item.id.indexOf( query.slice( 1 ) ) !== -1;
					} ).sort( function( a, b ) {
						// Sort at the beginning emoji starts with given query.
						var emojiName = query.substr( 1 ),
							isAStartWithEmojiName = a.id.substr( 1, emojiName.length ) === emojiName,
							isBStartWithEmojiName = b.id.substr( 1, emojiName.length ) === emojiName;

						if ( isAStartWithEmojiName && isBStartWithEmojiName || !isAStartWithEmojiName && !isBStartWithEmojiName ) {
							return a.id === b.id ? 0 : ( a.id > b.id ? 1 : -1 );
						} else if ( isAStartWithEmojiName ) {
							return -1;
						} else {
							return 1;
						}
					} );
					callback( data );
				}

				function isEmojiAllowed( range ) {
					var elementsPath,
						editable = editor.editable();
					if ( range ) {
						elementsPath = new CKEDITOR.dom.elementPath( range.startContainer, editable );
						return elementsPath.contains( forbiddenScope ) ? false : true;
					} else {
						return true;
					}
				}

				function hasForbiddenParent( htmlParserNode ) {
					if ( htmlParserNode.type === CKEDITOR.NODE_TEXT ) {
						return false;
					}

					if ( htmlParserNode.name && CKEDITOR.tools.array.indexOf( forbiddenScope, htmlParserNode.name ) !== -1 ) {
						return true;
					} else {
						return false;
					}
				}
			} );
		}
	} );
} )();


/**
 * Array with names of tags where emoji plugin remain inactive.
 *
 * ```js
 * 	editor.emoji_blacklistedElements = [ 'h1', 'h2' ];
 * ```
 *
 * @since 4.10.0
 * @cfg {String[]} [emoji_blacklistedElements = [ 'pre', 'code' ]]
 * @member CKEDITOR.config
 */

/**
 * Number which defines how many characters is required to start displaying emoji's autocomplete suggestion box.
 * Delimiter `:`, which activates emoji's suggestion box, is not included into this value.
 *
 * ```js
 * 	editor.emoji_minChars = 0; // Emoji suggestion box appear after typing ':'.
 * ```
 *
 * @since 4.10.0
 * @cfg {Number} [emoji_minChars = 2]
 * @member CKEDITOR.config
 */
