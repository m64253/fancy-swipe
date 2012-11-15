(function (root) {
	"use strict";
	
	
	var transition = root.transition,
		win = root.window,
		
		idCounter = 1,
		
		bind = function (fn, scope) {
			return function () {
				return fn.apply(scope, arguments);
			};
		},
		
		on = function (el, event, fn) {
			if (el.addEventListener) {
				el.addEventListener(event, fn, false);
			} else if (el.attachEvent) {
				el.attachEvent('on' + event, fn);
			}
		},
		
		off = function (el, event, fn) {
			if (el.removeEventListener) {
				el.removeEventListener(event, fn, false);
			} else if (el.detachEvent) {
				el.detachEvent('on' + event, fn);
			}
		},
		
		
		/**
		 * Fancy Swipe
		 * 
		 * @param {HTMLElement} el
		 * @param {Object} [options]
		 */
		FancySwipe = function TouchSwipe(el, options) {
			this.el = el;
			
			this.ul = this.el.getElementsByTagName('ul')[0];
						
			this.cid = 'touch_swipe:' + (idCounter++);
			
			this.options = options || {};
			if (!this.options.hasOwnProperty('disableTouch')) {
				this.options.disableTouch = false;
			}
			if (!this.options.hasOwnProperty('click')) {
				this.options.click = true;
			}
			
			this._propertyName = transition.transformPropertyName || 'left';
			
			this._onTouchStart = bind(this._onTouchStart, this);
			this._onTouchMove = bind(this._onTouchMove, this);
			this._onTouchEnd = bind(this._onTouchEnd, this);
			this._onClick = bind(this._onClick, this);
			this.next = bind(this.next, this);
			this.prev = bind(this.prev, this);
			
			if (this._propertyName.toLowerCase().indexOf('transform') !== -1) {
				this.el.style[this._propertyName] = 'translate3d(0, 0, 0)';
				this.ul.style[this._propertyName] = 'translate3d(0, 0, 0)';
			}
			
			this._bind();
			
			this.update();
		};
	
	
	FancySwipe.prototype = {
		_bind: function () {
			if (!this.options.disableTouch) {
				on(this.el, 'touchstart', this._onTouchStart);
			} else if (this.options.click) {
				on(this.el, 'click', this._onClick);
			}
		},
		
		
		_unbind: function () {
			off(this.el, 'touchstart', this._onTouchStart);
			off(this.el, 'click', this._onClick);
			
			off(win, 'touchmove', this._onTouchMove);
			off(win, 'touchend', this._onTouchEnd);
		},
		
		
		/**
		 * @param {HTMLElement} el
		 * @param {String} prop
		 * @return {String}
		 * @private
		 */
		_getStyle: function (el, prop) {
			var styles = root.getComputedStyle(el);
			return styles[prop];
		},
		
		
		_getEventPos: function (e) {
			return {
				x: ((e.touches && e.touches[0]) || e).clientX,
				y: ((e.touches && e.touches[0]) || e).clientY
			};
		},
		
		
		_slide: function () {
			if (this._current <= 0) {
				this._current = 0;
			} else if (this._current > this._maxWidth) {
				this._current = this._maxWidth;
			}
			
			transition.translate3d(this.ul, [ (this._current * -1) + 'px', 0, 0 ], {
				duration: this.options.duration || 250,
				easing: this.options.easing,
				callback: this.options.callback
			});
		},
		
		
		_onTouchStart: function (e) {
			on(win, 'touchmove', this._onTouchMove);
			on(win, 'touchend', this._onTouchEnd);
			
			this._start = this._getEventPos(e);
			
			this._latest = this._current;
			
			this._startTime = (new Date()).getTime();
		},
		
		
		_onTouchMove: function (e) {
			var eventPos = this._getEventPos(e),
				movedX = this._start.x - eventPos.x,
				movedY = this._start.y - eventPos.y,
				value;
			
			this._latest = this._current + movedX;
			
			value = (this._latest * -1) + 'px';
			if (this._propertyName.toLowerCase().indexOf('transform') !== -1) {
				value = 'translate3d(' + value + ', 0, 0)';
			}
			this.ul.style[this._propertyName] = value;
			
			// Prevent scrolling when move to much
			if (Math.abs(movedX) > 10) {
				e.preventDefault();
			}
			
			if (Math.abs(movedY) > 70) {
				this._onTouchEnd();
			}
		},
		
		
		_onTouchEnd: function () {
			off(win, 'touchmove', this._onTouchMove);
			off(win, 'touchend', this._onTouchEnd);
			
			var time = (new Date()).getTime() - this._startTime,
				current = Math.round(this._current / this._pageWidth),
				latest = Math.round(this._latest / this._pageWidth),
				moved = Math.abs(this._current - this._latest);
			
			if (time < 150 && moved > 10 && moved < (this._pageWidth / 2)) {
				if (this._latest > this._current) {
					latest += 1;
				} else {
					latest -= 1;
				}
			}
			
			this._current = (latest * this._pageWidth);
			
			// Back
			if ((latest - current) < 0) {
				this._current -= this._diff;
			}
			
			this._slide();
		},

		/**
		 * 
		 * @param {Event} e
		 * @private
		 */
		_onClick: function (e) {
			e.preventDefault();
			
			var ul = this.ul,
				findLi = function (el) {
					if (el && el.tagName === 'LI') {
						return el;
					}
					if (!el || el === ul || !el.parentNode) {
						return null;
					}
					return findLi(el.parentNode);
				},
				li = findLi(e.target),
				max = this._current + this._pageWidth,
				min = this._current,
				offsetLeft = (li && li.offsetLeft) || this._current,
				offsetWidth = (li && li.offsetWidth) || 0;
			
			if (offsetWidth !== this._pageWidth) {
				if (offsetLeft >= max || offsetLeft >= this._maxWidth) {
					this.next();
				} else if (offsetLeft < min || offsetLeft <= offsetWidth) {
					this.prev();
				}
			}
		},
		
		
		destroy: function () {
			this._unbind();
		},
		
		
		update: function () {
			var lis = this.ul.getElementsByTagName('li'),
				count = lis.length,
				fullWidth = parseInt(this._getStyle(this.el, 'width'), 10),
				itemWidth,
				spacing,
				unitsPerPage;
			
			this.ul.style.width = (fullWidth * 2) + 'px';
			
			itemWidth = lis[1].offsetLeft;
			spacing = (itemWidth - lis[1].offsetWidth) / 2;
			unitsPerPage = Math.floor(fullWidth / itemWidth);
			
			itemWidth -= spacing;
			
			this._current = 0;
			
			this._diff = Math.abs(fullWidth - (unitsPerPage * itemWidth)) - spacing;
			
			this._pageWidth = (fullWidth - this._diff - spacing);
			
			this._maxWidth = (count * itemWidth) - (this._pageWidth + this._diff);
			
			this.ul.style.width = ((count * itemWidth) + spacing) + 'px';
		},
			
		
		next: function () {
			this._current = (Math.round(this._current / this._pageWidth) + 1) * this._pageWidth;
			
			if (this._current > this._maxWidth) {
				this._current = this._maxWidth + (this._pageWidth * 0.3);
				transition.translate3d(this.ul, [ (this._current * -1) + 'px', 0, 0 ], {
					duration: this.options.duration || 250,
					easing: this.options.easing,
					callback: bind(function () {
						this._slide();
					}, this)
				});
				
			} else {
				this._slide();
			}
			
			return this;
		},
		
		
		prev: function () {
			this._current = ((Math.round(this._current / this._pageWidth) - 1) * this._pageWidth) - this._diff;
			
			if (this._current < 0) {
				this._current = -(this._pageWidth * 0.3);
				transition.translate3d(this.ul, [ (this._current * -1) + 'px', 0, 0 ], {
					duration: this.options.duration || 250,
					easing: this.options.easing,
					callback: bind(function () {
						this._slide();
					}, this)
				});
				
			} else {
				this._slide();
			}
			
			return this;
		}
	};
	
	
	root.FancySwipe = FancySwipe;
	
	
}(this));