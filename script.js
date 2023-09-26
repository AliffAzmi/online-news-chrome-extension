$(document).ready(function () {
  var deviceid = localStorage.getItem('cookie-device-id')

  if (deviceid === null) {
    var senderIds = ['556617380685']
    chrome.gcm.register(senderIds, function (deviceid) {
      $.ajax({
        url:
          'https://your-notification-domain.com/notification/client/register/' +
          senderIds,
        type: 'GET',
        dataType: 'text',
        beforeSend: function (xhr) {
          xhr.setRequestHeader('deviceid', deviceid)
          // Others header if needed
        },
        success: function () {
          $('#mk-notification-toggle').css('display', 'block')
          $('#mk-registering').css('display', 'none')

          home_notification_setting(deviceid)
          query_subs(deviceid, function (subs) {
            story_page_render(deviceid)
          })

          chrome.runtime.setUninstallURL(
            'https://your-domain.com/mk-chrome-extension/thank-you.html?device_id=' +
              deviceid,
            function () {}
          )
        }
      })

      localStorage.setItem('cookie-device-id', deviceid)
    })
  } else {
    $('#mk-notification-toggle').css('display', 'block')
    $('#mk-registering').css('display', 'none')

    story_page_render(deviceid)
    home_notification_setting(deviceid)
    query_subs(deviceid, function (subs) {
      story_page_fetch(deviceid)
    })
  }

  $('.feed-item').on('click', '.a_href_story', story_click)

  check_bookmark_via_notification()

  $('#settings_notification_button_save').on('click', setting_notification_save)

  $('#settings_rate_button').on('click', function () {
    chrome.tabs.create({
      url: 'https://chrome.google.com/webstore/detail/malaysiakini-news/mdjdnnlllhlkkehploinaldgileggbik/reviews'
    })
  })

  $('.mk-notification-toggle').on('click', setting_notification_toggle)

  $('.feed-item').on('click', '.mk-bookmark-story', story_bookmark)
  $('.feed-item').on('click', '.mk-star-story', story_favourite)

  $('#mk-tabbar')
    .children('ul')
    .children('li')
    .on('click', function (e) {
      mk_tabbar(e)
    })

  $('.rating_item').on('click', feedback_rating)
})

function mk_tabbar (e) {
  $('.mk-tabbar').removeClass('uk-active')
  $('.' + e.currentTarget.id).addClass('uk-active')
  $('#' + e.currentTarget.id).addClass('uk-active')

  mk_tabber_init(e.currentTarget.id)
}

function mk_tabber_init (tab_id) {
  if (tab_id == 'mk-tabbar-news') {
    story_page_render()
  } else if (tab_id == 'mk-tabbar-reading-list') {
    $('#feed-reading-list').html('')
    story_bookmark_page_render()
  } else if (tab_id == 'mk-tabbar-favourites') {
    $('#feed-fav').html('')
    story_favourites_page_render()
  } else if (tab_id == 'mk-tabbar-settings') {
    settings_notification_prefill()
  }
}

function story_page_render (deviceid) {
  var stories = localStorage.getItem('cookie-stories')
  var stories_hash = localStorage.getItem('cookie-stories-hash')

  if (!stories) {
    story_fetch(deviceid, false, function (r) {
      localStorage.setItem('cookie-stories', JSON.stringify(r.result))
      localStorage.setItem('cookie-stories-hash', r.result_hash)

      story_page_paint(r.result)
    })
  } else {
    story_page_paint(JSON.parse(stories))
  }
}

function story_page_paint (r) {
  var data = r

  var items = data

  var buf = ''

  $.each(items, function (index, value) {
    var sid = value.sid
    var linked = value.link
    var title = value.title
    var summary = value.summary
    var pub_datetime_timeago = jQuery.timeago(value.date_pub)
    var lang = value.lang

    var linked = 'http://your-domain.com' + '/news/' + value.sid

    buf +=
      "<div class='uk-panel uk-position-relative' style='border-bottom:1px dashed #ddd;'>"
    buf +=
      "	<div class='mk-article-cover-new uk-cover' style='display:none;background-color:orange;opacity:0.2;width: 100%;height: 100%;position: absolute;'></div>"
    buf += "	<div style='padding: 20px 30px;'>"
    buf +=
      "		<a href='#' class='a_href_story a_href_story-" +
      sid +
      "' sid='" +
      sid +
      "' source_href='latest' to_href='" +
      linked +
      "' target='_blank'>"
    buf +=
      "			<span class='uk-panel-title' id='title_" +
      sid +
      "'>" +
      title +
      '</span> &nbsp; '
    if (lang == 'zh') {
      buf += '<br />'
    }
    buf +=
      "		  	<span class='uk-text-muted' id='desc_" +
      sid +
      "'>" +
      summary +
      '</span>'
    buf +=
      "			<div id='datetime_" +
      sid +
      "' datetime_value='" +
      value.pub_datetime +
      "' class='uk-text-small' style='margin-top:5px;color:#757575'><i class='uk-icon-clock-o uk-text-muted'></i> " +
      pub_datetime_timeago +
      '</div>'
    buf += '		</a>'
    buf += '	</div>'
    buf +=
      "	<div class='uk-position-bottom-right uk-margin-bottom uk-margin-right'>"
    buf += "		<div class='uk-button-group'>"
    buf +=
      "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-bookmark-story' sid='" +
      sid +
      "' title='Bookmark this story in Reading List'><i class='uk-icon-bookmark book_" +
      sid +
      "' style='color:#999;' id='book_" +
      sid +
      "'></i></a> "
    buf +=
      "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-star-story' sid='" +
      sid +
      "' title='Mark this story as Favourite'><i class='uk-icon-heart star_" +
      sid +
      "' style='color:#999;' id='star_" +
      sid +
      "'></i></a> "
    buf += '		</div>'
    buf += '	</div>'
    buf += '</div>'
  })

  $('#feed-title').html(buf)

  story_bookmark_mark()
  story_favourite_mark()
  story_visited_mark()
}

function story_fetch (deviceid, hash, callback) {
  var subs = JSON.parse(localStorage.getItem('cookie-subs'))

  var limit = 20
  var offset = 0
  var lang = ''
  var lang_each = ''

  var hash_str = ''

  if (hash == true) {
    hash_str = 'hash/'
  }

  $.each(subs, function (index, value) {
    lang_each = value.split(':')
    lang += lang_each[1] + ','
  })

  var uri =
    'http://your-domain.com/get/list/recent/' +
    hash_str +
    '?lang=' +
    lang +
    '&cat=news&limit=' +
    limit +
    '&offset=' +
    offset

  $.ajax({
    url: uri,
    type: 'GET',
    dataType: 'json',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (r) {
      callback(r)
    }
  })
}

function query_subs (deviceid, callback) {
  $.ajax({
    url: 'https://your-notification-domain.com/notification/client/subscribe/get/',
    type: 'GET',
    dataType: 'json',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (subs) {
      subs = subs.result

      localStorage.setItem('cookie-subs', JSON.stringify(subs))

      callback(subs)
    }
  })
}

function story_click (e) {
  e.preventDefault()

  var to_href = $(this).attr('to_href')
  var source_href = $(this).attr('source_href')
  var sid = $(this).attr('sid')

  var currentdate = new Date()

  ga('send', {
    hitType: 'event',
    eventCategory: 'Open Story - ' + source_href,
    eventAction: 'click',
    eventLabel: to_href
  })

  var visited_sidlist = localStorage.getItem('cookie-visited-sidlist')
  if (visited_sidlist == null) {
    visited_sidlist = {}
  } else {
    visited_sidlist = JSON.parse(visited_sidlist)
  }

  visited_sidlist[sid] = currentdate

  localStorage.setItem('cookie-visited-sidlist', JSON.stringify(visited_sidlist))

  chrome.tabs.create({ url: to_href })
}

function home_notification_setting (deviceid) {
  $.ajax({
    url: 'https://your-notification-domain.com/notification/client/settings/get/',
    type: 'GET',
    dataType: 'json',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (settings) {
      settings = settings.result

      localStorage.setItem('cookien-settings', JSON.stringify(settings))

      if (settings.active == 'no') {
        $('#mk-notification-toggle-off').removeClass('uk-hidden')
        $('#mk-notification-toggle-on').addClass('uk-hidden')
      } else {
        $('#mk-notification-toggle-off').addClass('uk-hidden')
        $('#mk-notification-toggle-on').removeClass('uk-hidden')
      }

      $('#settings_notification_type').val(settings.type)
    }
  })
}

function story_page_fetch (deviceid) {
  var story_hash = localStorage.getItem('cookie-stories-hash')

  if (story_hash != null) {
    setTimeout(function () {
      $('.mk-notify-alert').animate(
        { opacity: 1, marginTop: 0 },
        200,
        function () {
          setTimeout(function () {
            story_fetch(deviceid, true, function (r) {
              if (story_hash == r.result_hash) {
                $('.mk-notify-alert').html('No new items')
                setTimeout(function () {
                  $('.mk-notify-alert').animate(
                    { opacity: 0, marginTop: -20 },
                    400,
                    function () {}
                  )
                }, 1000)
              } else {
                $('.mk-notify-alert').html('Fetching...')

                setTimeout(function () {
                  story_fetch(deviceid, false, function (r) {
                    localStorage.setItem(
                      'cookie-stories',
                      JSON.stringify(r.result)
                    )
                    localStorage.setItem('cookie-stories-hash', r.result_hash)

                    $('#feed-title').html(r.result)

                    story_page_paint(r.result)

                    $('.mk-notify-alert').html('Done')
                    setTimeout(function () {
                      $('.mk-notify-alert').animate(
                        { opacity: 0, marginTop: -20 },
                        400,
                        function () {}
                      )
                    }, 1000)
                  })
                }, 500)
              }
            })
          }, 1000)
        }
      )
    }, 2000)
  }
}

function check_bookmark_via_notification () {
  var from_notifi = localStorage.getItem('cookie-booknotifi-sidlist')
  if (from_notifi != undefined) {
    from_notifi = JSON.parse(from_notifi)

    var size = Object.keys(from_notifi).length

    if (size >= 1) {
      ga('send', {
        hitType: 'event',
        eventCategory: 'Notification - Read Later',
        eventAction: 'click',
        eventLabel: 'Extension OnLoad'
      })

      $('#notifi-num-total').html(size)
      $('#notifi-num-total').css('display', 'block')
    }
  }
}

function story_bookmark () {
  var sid = $(this).attr('sid')

  var currentdate = new Date()
  var book_sidlist = localStorage.getItem('cookie-book-sidlist')
  book_sidlist = JSON.parse(book_sidlist)
  if (book_sidlist == null) {
    book_sidlist = {}
  }

  var try_to_get = localStorage.getItem('cookie-book-' + sid)
  if (try_to_get == undefined) {
    console.log('bookmark add ' + sid)

    $('.book_' + sid).css('color', 'orange')

    var value = {}
    value.sid = sid
    value.title = $('#title_' + sid).html()
    value.desc = $('#desc_' + sid).html()
    value.datetime = $('#datetime_' + sid).attr('datetime_value')

    localStorage.setItem('cookie-book-' + sid, JSON.stringify(value))

    book_sidlist[sid] = currentdate

    ga('send', {
      hitType: 'event',
      eventCategory: 'Buttons - Bookmark',
      eventAction: 'click',
      eventLabel: 'http://your-domain.com/news/' + sid
    })
  } else {
    console.log('bookmark remove ' + sid)

    $('.book_' + sid).css('color', '#999')

    localStorage.removeItem('cookie-book-' + sid)

    delete book_sidlist[sid]

    $('#feed-reading-list-' + sid).remove()

    var size = Object.keys(book_sidlist).length
    if (size == 0) {
      $('.reading-list-no-feed').css('display', 'block')
    }
  }

  localStorage.setItem('cookie-book-sidlist', JSON.stringify(book_sidlist))
}

function story_bookmark_mark () {
  var book_sidlist = localStorage.getItem('cookie-book-sidlist')
  book_sidlist = JSON.parse(book_sidlist)

  $.each(book_sidlist, function (index, value) {
    var sid = index

    $('#book_' + sid).css('color', 'orange')
  })
}

function story_bookmark_page_render () {
  $('#notifi-num-total').css('display', 'none')
  $('#notifi-num-total').html('')
  localStorage.removeItem('cookie-booknotifi-sidlist')

  var book_sidlist = localStorage.getItem('cookie-book-sidlist')
  book_sidlist = JSON.parse(book_sidlist)

  if (book_sidlist) {
    var size = Object.keys(book_sidlist).length
  } else {
    var size = 0
  }

  if (size >= 1) {
    $('.reading-list-no-feed').css('display', 'none')

    var buf = ''

    var fav_sidlist = localStorage.getItem('cookie-fav-sidlist')
    if (fav_sidlist) {
      fav_sidlist = JSON.parse(fav_sidlist)
    } else {
      fav_sidlist = {}
    }

    $.each(book_sidlist, function (index, value) {
      var sid = index
      var story = localStorage.getItem('cookie-book-' + sid)
      story = JSON.parse(story)

      var title = story.title
      var summary = story.desc
      var pub_datetime_timeago = moment(story.date_pub).format(
        'D MMMM YYYY, h:mm a'
      )

      var linked = 'http://your-domain.com/news/' + sid

      var fav_icon_color = '#999'
      if (fav_sidlist[sid] != undefined) {
        fav_icon_color = 'red'
      }

      buf +=
        "<div id='feed-reading-list-" +
        sid +
        "' class='uk-panel uk-panel-space uk-position-relative' style='border-bottom:1px dashed #ddd;padding:20px 30px;'>"
      buf += '	<div>'
      buf +=
        "		<a href='#' class='a_href_story a_href_story-" +
        sid +
        "' sid='" +
        sid +
        "' source_href='bookmark' to_href='" +
        linked +
        "' target='_blank'>"
      buf +=
        "			<span class='uk-panel-title' id='title_" +
        sid +
        "'>" +
        title +
        '</span>'
      buf +=
        "		 &nbsp; <span class='uk-text-muted' id='desc_" +
        sid +
        "'>" +
        summary +
        '</span>'
      buf +=
        "			<div id='datetime_" +
        sid +
        "' datetime_value='" +
        value.date_pub +
        "' class='uk-text-small' style='margin-top:5px;color:#757575'><i class='uk-icon-calendar-o uk-text-muted'></i> " +
        pub_datetime_timeago +
        '</div>'
      buf += '		</a>'
      buf += '	</div>'
      buf +=
        "	<div class='uk-position-bottom-right uk-margin-bottom uk-margin-right'>"
      buf += "		<div class='uk-button-group'>"
      buf +=
        "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-bookmark-story mk-bookmark-story-to-remove' sid='" +
        sid +
        "' title='Remove from Reading List'><i class='uk-icon-bookmark book_" +
        sid +
        "' style='color:orange;' id='book_" +
        sid +
        "'></i></a> "
      buf +=
        "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-star-story' sid='" +
        sid +
        "' title='Mark this story as Favourite'><i class='uk-icon-heart star_" +
        sid +
        "' style='color:" +
        fav_icon_color +
        ";' id='star_" +
        sid +
        "'></i></a> "
      buf += '		</div>'
      buf += '	</div>'
      buf += '</div>'
    })

    $('#feed-reading-list').html(buf)

    story_favourite_mark()
    story_visited_mark()
  } else {
    $('.reading-list-no-feed').css('display', 'block')
  }
}

function story_favourite () {
  var sid = $(this).attr('sid')

  var currentdate = new Date()
  var fav_sidlist = localStorage.getItem('cookie-fav-sidlist')
  fav_sidlist = JSON.parse(fav_sidlist)
  if (fav_sidlist == null) {
    fav_sidlist = {}
  }

  var try_to_get = localStorage.getItem('cookie-fav-' + sid)
  if (try_to_get == undefined) {
    console.log('fav add ' + sid)

    $('.star_' + sid).css('color', 'red')

    var value = {}
    value.sid = sid
    value.title = $('#title_' + sid).html()
    value.desc = $('#desc_' + sid).html()
    value.datetime = $('#datetime_' + sid).attr('datetime_value')

    localStorage.setItem('cookie-fav-' + sid, JSON.stringify(value))

    fav_sidlist[sid] = currentdate

    ga('send', {
      hitType: 'event',
      eventCategory: 'Buttons - Favourite',
      eventAction: 'click',
      eventLabel: 'http://your-domain.com/news/' + sid
    })
  } else {
    console.log('fav remove ' + sid)

    $('.star_' + sid).css('color', '#999')

    localStorage.removeItem('cookie-fav-' + sid)

    delete fav_sidlist[sid]

    $('#feed-fav-' + sid).remove()

    var size = Object.keys(fav_sidlist).length
    if (size == 0) {
      $('.fav-no-feed').css('display', 'block')
    }
  }

  localStorage.setItem('cookie-fav-sidlist', JSON.stringify(fav_sidlist))
}

function story_favourite_mark () {
  var fav_sidlist = localStorage.getItem('cookie-fav-sidlist')
  fav_sidlist = JSON.parse(fav_sidlist)

  $.each(fav_sidlist, function (index, value) {
    var sid = index

    $('#star_' + sid).css('color', 'red')
  })
}

function story_favourites_page_render () {
  var fav_sidlist = localStorage.getItem('cookie-fav-sidlist')
  fav_sidlist = JSON.parse(fav_sidlist)

  if (fav_sidlist) {
    var size = Object.keys(fav_sidlist).length
  } else {
    var size = 0
  }

  if (size >= 1) {
    $('.fav-no-feed').css('display', 'none')

    var buf = ''

    var book_sidlist = localStorage.getItem('cookie-book-sidlist')
    book_sidlist = JSON.parse(book_sidlist)

    $.each(fav_sidlist, function (index, value) {
      var sid = index
      var story = localStorage.getItem('cookie-fav-' + sid)
      story = JSON.parse(story)

      var title = story.title
      var summary = story.desc

      var pub_datetime_timeago = moment(story.date_pub).format(
        'D MMMM YYYY, h:mm a'
      )

      var linked = 'http://your-domain.com/news/' + sid

      var book_icon_color = '#999'
      if (book_sidlist[sid] != undefined) {
        book_icon_color = 'orange'
      }

      buf +=
        "<div id='feed-fav-" +
        sid +
        "' class='uk-panel uk-panel-space uk-position-relative' style='border-bottom:1px dashed #ddd;padding:20px 30px;'>"
      buf += '	<div>'
      buf +=
        "		<a href='#' class='a_href_story a_href_story-" +
        sid +
        "' sid='" +
        sid +
        "' source_href='avourite' to_href='" +
        linked +
        "' target='_blank'>"
      buf +=
        "			<span class='uk-panel-title' id='title_" +
        sid +
        "'>" +
        title +
        '</span>'
      buf +=
        "		 &nbsp; <span class='uk-text-muted' id='desc_" +
        sid +
        "'>" +
        summary +
        '</span>'
      buf +=
        "			<div id='datetime_" +
        sid +
        "' datetime_value='" +
        value.date_pub +
        "' class='uk-text-small' style='margin-top:5px;color:#757575'><i class='uk-icon-calendar-o uk-text-muted'></i> " +
        pub_datetime_timeago +
        '</div>'
      buf += '		</a>'
      buf += '	</div>'
      buf +=
        "	<div class='uk-position-bottom-right uk-margin-bottom uk-margin-right'>"
      buf += "		<div class='uk-button-group'>"
      buf +=
        "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-bookmark-story' sid='" +
        sid +
        "' title='Bookmark this story in Reading List'><i class='uk-icon-bookmark book_" +
        sid +
        "' style='color:" +
        book_icon_color +
        ";' id='book_" +
        sid +
        "'></i></a> "
      buf +=
        "			<a class='uk-button uk-button-mini uk-button-link mk-story-buttons mk-star-story' sid='" +
        sid +
        "' title='Mark this story as Favourite'><i class='uk-icon-heart star_" +
        sid +
        "' style='color:red;' id='star_" +
        sid +
        "'></i></a> "
      buf += '		</div>'
      buf += '	</div>'
      buf += '</div>'
    })

    $('#feed-fav').html(buf)

    story_visited_mark()
  } else {
    $('.fav-no-feed').css('display', 'block')
  }
}

function story_visited_mark () {
  var visited_sidlist = localStorage.getItem('cookie-visited-sidlist')
  visited_sidlist = JSON.parse(visited_sidlist)

  $.each(visited_sidlist, function (index, value) {
    var sid = index

    $('.a_href_story-' + sid).addClass('mk-visited')
  })
}

function setting_notification_toggle () {
  var settings_notification_type = $('#settings_notification_type').val()

  var param_type = settings_notification_type

  if ($('#mk-notification-toggle-on').hasClass('uk-hidden')) {
    $('#mk-notification-toggle-off').addClass('uk-hidden')
    $('#mk-notification-toggle-on').removeClass('uk-hidden')

    setting_notification_save_ajax(
      'settings',
      '/notification/client/settings/set/?active=yes&type=' +
        param_type +
        '&mute=0'
    )
  } else {
    console.log('set notifi off')

    $('#mk-notification-toggle-on').addClass('uk-hidden')
    $('#mk-notification-toggle-off').removeClass('uk-hidden')

    setting_notification_save_ajax(
      'settings',
      '/notification/client/settings/set/?active=no&type=' +
        param_type +
        '&mute=0'
    )
  }
}

function settings_notification_prefill () {
  var manifest = chrome.runtime.getManifest()
  $('#mkext_version_from_manifest').html(manifest.version_name)

  var deviceid = localStorage.getItem('cookie-deviceid')

  $.ajax({
    url: 'https://your-notification-domain.com/notification/client/settings/get/',
    type: 'GET',
    dataType: 'json',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (settings) {
      if (settings.result.active == 'no') {
        $('#settings_notification_onoff').prop('checked', false)
        $('#mk-notification-toggle-off').removeClass('uk-hidden')
        $('#mk-notification-toggle-on').addClass('uk-hidden')
      } else {
        $('#settings_notification_onoff').prop('checked', true)
        $('#mk-notification-toggle-off').addClass('uk-hidden')
        $('#mk-notification-toggle-on').removeClass('uk-hidden')
      }

      $('#settings_notification_type').val(settings.result.type)
    }
  })

  $.ajax({
    url: 'https://your-notification-domain.com/notification/client/subscribe/get/',
    type: 'GET',
    dataType: 'json',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (subscribe) {
      $.each(subscribe.result, function (index, value) {
        $('[id="settings_notification_chan_' + value + '"]').prop(
          'checked',
          true
        )
      })
    }
  })
}

function setting_notification_save () {
  var param_active

  var settings_notification_onoff = $('#settings_notification_onoff').prop(
    'checked'
  )
  var settings_notification_type = $('#settings_notification_type').val()

  if (settings_notification_onoff == true) {
    param_active = 'yes'
  } else {
    param_active = 'no'
  }

  var param_type = settings_notification_type

  setting_notification_save_ajax(
    'settings',
    '/notification/client/settings/set/?active=' +
      param_active +
      '&type=' +
      param_type +
      '&mute=0'
  )

  var settings_notification_chan_mk_en = ''
  var settings_notification_chan_mk_bm = ''
  var settings_notification_chan_mk_cn = ''

  if ($('[id="settings_notification_chan_mk-lang:en"]').is(':checked')) {
    settings_notification_chan_mk_en = 'mk-lang:en'
  }
  if ($('[id="settings_notification_chan_mk-lang:my"]').is(':checked')) {
    settings_notification_chan_mk_bm = 'mk-lang:my'
  }
  if ($('[id="settings_notification_chan_mk-lang:zh"]').is(':checked')) {
    settings_notification_chan_mk_cn = 'mk-lang:zh'
  }

  var subscribe_payload =
    settings_notification_chan_mk_en +
    ',' +
    settings_notification_chan_mk_bm +
    ',' +
    settings_notification_chan_mk_cn

  setting_notification_save_ajax(
    'subscribe',
    '/notification/client/subscribe/set/?value=' + subscribe_payload
  )
}

function setting_notification_save_ajax (type, url_with_get) {
  var deviceid = localStorage.getItem('cookie-deviceid')

  $('#settings_notification_button_save').css('background-color', '#82bb42')
  $('#settings_notification_button_save').val('Saved!')

  setTimeout(function () {
    $('#settings_notification_button_save').css('background-color', '#00aff2')
    $('#settings_notification_button_save').val('Save Settings')
  }, 1000)

  $.ajax({
    url: 'https://your-domain.com' + url_with_get,
    type: 'GET',
    dataType: 'text',
    beforeSend: function (xhr) {
      xhr.setRequestHeader('deviceid', deviceid)
    },
    success: function (r) {
      query_subs(deviceid, function () {
        story_page_fetch(deviceid)
      })
    }
  })
}

function feedback_rating () {
  var num_of_rating = $(this).val()

  localStorage.setItem('cookie-local-rating', num_of_rating)

  if (num_of_rating <= 1) {
    $('#feedback-rating-thankyou').html('Oh man!')
  }
  if (num_of_rating == 5) {
    $('#feedback-rating-thankyou').html('Thank you! Awesome!')
  }

  $('#feedback-rating-thankyou').css('display', 'block')
  $('.rating').css('display', 'none')

  setTimeout(function () {
    $('#feedback-rating-thankyou').html('Thank you.')
    $('#feedback-rating-thankyou').css('display', 'none')
    $('.rating').css('display', 'block')
  }, 2000)

  ga('send', {
    hitType: 'event',
    eventCategory: 'Settings',
    eventAction: 'rate',
    eventLabel: 'Local Rating - ' + num_of_rating
  })
}
