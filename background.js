chrome.gcm.onMessagesDeleted.addListener(function (message) {
  console.log(message)
})

chrome.gcm.onMessage.addListener(function (message) {
  console.log(message)

  var payload = JSON.parse(message.data.message)

  var deviceid = localStorage.getItem('{cookie-device-id}')

  if (deviceid === null) {
  } else {
    if (payload.device_id == deviceid) {
      chrome.storage.sync.set({ mknotificationpoppayload: payload })

      var payload_imageUrl = ''
      var payload_iconUrl = ''

      if (
        payload.notifi_type == 'image_big' ||
        payload.notifi_type == 'image'
      ) {
        payload_iconUrl = 'images/mkini.png'
        payload_imageUrl = payload.imgbig_uri
      } else if (payload.notifi_type == 'image_small') {
        payload_iconUrl = payload.imgthumb_uri
        payload_imageUrl = ''
      } else {
        payload_iconUrl = 'images/mkini.png'
        payload_imageUrl = ''
      }

      chrome.notifications.create(
        'mknotificationpop',
        {
          type: payload.type,
          iconUrl: payload_iconUrl,
          title: payload.title,
          message: payload.message,
          imageUrl: payload_imageUrl,
          buttons: [
            { title: 'Open Article' },
            { title: 'Save to Reading List' }
          ],
          priority: 0
        },
        function () {}
      )
    }
  }
})

chrome.notifications.onClicked.addListener(function (id) {
  chrome.storage.sync.get('mknotificationpoppayload', function (payload) {
    var payload_string = JSON.stringify(payload)
    var page_uri = payload.mknotificationpoppayload.page_uri

    chrome.tabs.create({
      url:
        page_uri +
        '?utm_source=ChromeExtension&utm_medium=ChromeNotificationService&utm_campaign=Open'
    })

    chrome.notifications.clear('mknotificationpop', function () {})
  })
})

chrome.notifications.onButtonClicked.addListener(function (id, buttonIndex) {
  chrome.storage.sync.get('mknotificationpoppayload', function (payload) {
    var payload_string = JSON.stringify(payload)
    var page_uri = payload.mknotificationpoppayload.page_uri

    if (buttonIndex == 0) {
      chrome.tabs.create({
        url:
          page_uri +
          '?utm_source=ChromeExtension&utm_medium=ChromeNotificationService&utm_campaign=OpenViaButtonMenu'
      })
      chrome.notifications.clear('mknotificationpop', function () {})
    }

    if (buttonIndex == 1) {
      story_bookmark_via_notification(payload_string)
      chrome.notifications.clear('mknotificationpop', function () {})
    }
  })
})

function story_bookmark_via_notification (data) {
  from_notifi = JSON.parse(data)
  var sid = from_notifi.mknotificationpoppayload.sid

  var currentdate = new Date()
  var book_sidlist = localStorage.getItem('cookie-book-sidlist')
  book_sidlist = JSON.parse(book_sidlist)
  if (book_sidlist == null) {
    book_sidlist = {}
  }
  book_sidlist[sid] = currentdate
  localStorage.setItem('cookie-book-sidlist', JSON.stringify(book_sidlist))

  var value = {}
  value.sid = sid
  value.title = from_notifi.mknotificationpoppayload.title
  value.desc = from_notifi.mknotificationpoppayload.message
  value.datetime = from_notifi.mknotificationpoppayload.pub_datetime

  localStorage.setItem('cookie-book-' + sid, JSON.stringify(value))

  var book_sidlist = localStorage.getItem('cookie-book-sidlist')
  book_sidlist = JSON.parse(book_sidlist)
  if (book_sidlist == null) {
    book_sidlist = {}
  }
  book_sidlist[sid] = currentdate
  localStorage.setItem('cookie-book-sidlist', JSON.stringify(book_sidlist))
}
