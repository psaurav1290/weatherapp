var container = document.querySelector("#scroll-container"),
	navbar = document.querySelector(".navbar"),
	headerHeight,
	lastScrollTop = 0,
	currentCoordinates = {},
	globalCoordinates = {},
	info = {},
	currentCoordinatesCalculating = false,
	textField = document.querySelector("#place-textfield"),
	nowCard = document.querySelector(".now-card"),
	forecastCard = document.querySelector(".forecast-card"),
	pastCard = document.querySelector(".past-card"),
	batchCellsForecast = document.querySelector(".batch-cells-forecast"),
	batchCellsPast = document.querySelector(".batch-cells-past"),
	batchCell = document.querySelector("#batch-weather-container").querySelectorAll(".batch-cell")

reflectInformationCard = (card, day) => {
	var infoFields = "weather description temperature humidity wind".split(" ")
	for (var i in infoFields) {
		card.querySelector(`.${infoFields[i]}-cell`).textContent = info[day][infoFields[i]]
	}
	card.querySelector(".display-image").style.backgroundImage = `url(img/weather-wall/${info[day].icon}.png)`
	reflectTime = new Date(info[day].time.getTime() + info.timezone)
	card.querySelector(".display-image-date").textContent = "(" + reflectTime.toUTCString().split(" GMT")[0].replace(", ", ") ", 1)
	// let placeWords = info.place.trim().split(/[^\d\w,]+/);
	// placeWords.forEach(x => x[0].toUpperCase())
	// placeWords = placeWords.join(" ")
	card.querySelector(".display-image-place").innerHTML = info.place
}
reflectBatchContainer = (container, day, index) => {
	container.querySelectorAll(".week-day")[index].textContent = info[day].time.toUTCString().split(", ")[0]
	container.querySelectorAll(".week-image")[index].style.backgroundImage = `url(img/weather-icon/${info[day].icon}@4x.png)`
}

batchCell.forEach(cell => cell.addEventListener("click", (self) => {
	card = self.target.parentElement.parentElement.parentElement.querySelector(".batch-card")
	reflectInformationCard(card, self.target.parentElement.dataset.index)
	batchCellSelected = self.target.parentElement.parentElement.querySelector(".batch-cell-selected")
	if (batchCellSelected)
		batchCellSelected.classList.toggle("batch-cell-selected")
	self.target.parentElement.classList.toggle("batch-cell-selected")
	card.style.display = "block"
}, true))

textField.addEventListener('keypress', function (event) {
	if (event.keyCode == 13) {
		event.preventDefault()
		getWeatherInfo()
	}
});

getWeatherInfo = () => {
	var weaThrottle = "7065de1505e424f29d33baf26a38155b",
		geoThrottle = "7c7dbb02adcb4ff0b8c8588c25b8e793";

	dmsToDeg = (deg = 0, min = 0, sec = 0, ms = 0, dir = "N") => {
		let deci = (deg / 1 + min / 60 + sec / 3600 + ms / 216000)
		if (dir == "W" || dir == "S")
			return -1 * deci
		return deci
	}

	storeInfo = (temp, humidity, speed, main, description, icon, time) => {
		return {
			"temperature": temp,
			"humidity": humidity,
			"wind": speed,
			"weather": main,
			"description": description,
			"icon": icon,
			"time": time
		}
	}

	var inputUri,
		geoUrl = "",
		inputPlace = textField.value

	if (currentCoordinatesCalculating == false) {
		if (inputPlace == "")
			return
		else if (["my location", "my city", "my area", "my place", "here", "my state", "my town"].includes(inputPlace.trim().toLowerCase())) {
			currentCoordinatesCalculating = true
			inputPlace = "Kolkata, India"
		}
	} else {
		inputPlace = "Kolkata, India"
	}

	inputUri = encodeURI(inputPlace);
	geoUrl = `https://api.opencagedata.com/geocode/v1/json?q=${inputUri}&key=${geoThrottle}&limit=1`;

	const now = new Date();
	const pastHour = now.getUTCHours()
	var nowTime = Math.floor(now.getTime() / 1000);
	var fetchPromiseGeo = fetch(geoUrl);
	fetchPromiseGeo.then(response => {
		return response.json();
	}).then(data => {
		if (currentCoordinatesCalculating) {
			info["place"] = "Your Location <span style='font-size:0.7rem;display:block;'>*Accuracy of location depends on your Internet Service provider</span>"
			globalCoordinates = currentCoordinates
			// console.log("Current Coordinates calculating - ", currentCoordinates)
		} else {
			info["place"] = inputPlace
			if (!data.total_results)
				throw new Error("No such place")
			else if (data.status.code == 402)
				throw new Error("Daily Quota Exceeded")
			globalCoordinates["lat"] = dmsToDeg(...data.results[0].annotations.DMS.lat.split(/[^\d\w]+/)).toFixed(3);
			globalCoordinates["lng"] = dmsToDeg(...data.results[0].annotations.DMS.lng.split(/[^\d\w]+/)).toFixed(3);
			// console.log("Entered Coordinates calculating - ", globalCoordinates)
		}
	}).then((nowInfo) => {
		// console.log("Now Global Coordinates - ", globalCoordinates)
		var nowUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&appid=${weaThrottle}&units=metric`;
		// console.log(nowUrl)
		var fetchPromiseNow = fetch(nowUrl);
		fetchPromiseNow.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Now data = ", data)
			info["timezone"] = data.timezone * 1000
			info[0] = storeInfo(data.main.temp, data.main.humidity, data.wind.speed, data.weather[0].main, data.weather[0].description, data.weather[0].icon, now);
			document.querySelector(".background-blur").style.backgroundImage = `url(img/weather-wall/${info[0].icon}.png)`
			reflectInformationCard(nowCard, 0)
			// console.log("Now info = ", info["0"])
		}).catch((errorMessage) => {
			// console.log("Now error generated")
			// alert(errorMessage)
		});
	}).then((forecastInfo) => {
		var forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&appid=${weaThrottle}&units=metric`;
		// console.log("Forecast url = ", forecastUrl)
		var fetchPromiseForecast = fetch(forecastUrl);
		fetchPromiseForecast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Forecast data = ", data)
			var index, i = 7;
			var nowSec = now.getTime()
			for (index = 1; index <= 5; index++, i += 8) {
				info[index] = storeInfo(data.list[i].main.temp, data.list[i].main.humidity, data.list[i].wind.speed, data.list[i].weather[0].main, data.list[i].weather[0].description, data.list[i].weather[0].icon, new Date(nowSec + index * 86400000));
				reflectBatchContainer(batchCellsForecast, index, index - 1)
				// console.log(`Forecast info [${index}] = `, info[index])
			}
		}).catch((errorMessage) => {
			// console.log("Forecast error generated")
			// alert(errorMessage)
		})
	}).then((pastInfo1) => {
		nowTime -= 86400
		var nowDateLocal = new Date(nowTime * 1000)
		var pastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&dt=${nowTime}&appid=${weaThrottle}&units=metric`;
		// console.log("Past 1 url = ", pastUrl)
		var fetchPromisePast = fetch(pastUrl);
		fetchPromisePast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Past 1 data = ", data)
			info[-1] = storeInfo(data.hourly[pastHour].temp, data.hourly[pastHour].humidity, data.hourly[pastHour].wind_speed, data.hourly[pastHour].weather[0].main, data.hourly[pastHour].weather[0].description, data.hourly[pastHour].weather[0].icon, nowDateLocal)
			reflectBatchContainer(batchCellsPast, -1, 4)
			// console.log("Past 1 info = ", info["-1"])
		}).catch((errorMessage) => {
			// console.log("Past 1 error generated")
			// alert(errorMessage)
		});
	}).then((pastInfo2) => {
		nowTime -= 86400
		var nowDateLocal = new Date(nowTime * 1000)
		var pastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&dt=${nowTime}&appid=${weaThrottle}&units=metric`;
		// console.log("Past 2 url = ", pastUrl)
		var fetchPromisePast = fetch(pastUrl);
		fetchPromisePast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Past 2 data = ", data)
			info[-2] = storeInfo(data.hourly[pastHour].temp, data.hourly[pastHour].humidity, data.hourly[pastHour].wind_speed, data.hourly[pastHour].weather[0].main, data.hourly[pastHour].weather[0].description, data.hourly[pastHour].weather[0].icon, nowDateLocal)
			reflectBatchContainer(batchCellsPast, -2, 3)
			// console.log("Past 2 info = ", info["-2"])
		}).catch((errorMessage) => {
			// console.log("Past 2 error generated")
			// alert(errorMessage)
		});
	}).then((pastInfo3) => {
		nowTime -= 86400
		var nowDateLocal = new Date(nowTime * 1000)
		var pastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&dt=${nowTime}&appid=${weaThrottle}&units=metric`;
		// console.log("Past 3 url = ", pastUrl)
		var fetchPromisePast = fetch(pastUrl);
		fetchPromisePast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Past 3 data = ", data)
			info[-3] = storeInfo(data.hourly[pastHour].temp, data.hourly[pastHour].humidity, data.hourly[pastHour].wind_speed, data.hourly[pastHour].weather[0].main, data.hourly[pastHour].weather[0].description, data.hourly[pastHour].weather[0].icon, nowDateLocal)
			reflectBatchContainer(batchCellsPast, -3, 2)
			// console.log("Past 3 info = ", info["-3"])
		}).catch((errorMessage) => {
			// console.log("Past 3 error generated")
			// alert(errorMessage)
		});
	}).then((pastInfo4) => {
		nowTime -= 86400
		var nowDateLocal = new Date(nowTime * 1000)
		var pastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&dt=${nowTime}&appid=${weaThrottle}&units=metric`;
		// console.log("Past 4 url = ", pastUrl)
		var fetchPromisePast = fetch(pastUrl);
		fetchPromisePast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Past 4 data = ", data)
			info[-4] = storeInfo(data.hourly[pastHour].temp, data.hourly[pastHour].humidity, data.hourly[pastHour].wind_speed, data.hourly[pastHour].weather[0].main, data.hourly[pastHour].weather[0].description, data.hourly[pastHour].weather[0].icon, nowDateLocal)
			reflectBatchContainer(batchCellsPast, -4, 1)
			// console.log("Past 4 info = ", info["-4"])
		}).catch((errorMessage) => {
			// console.log("Past 4 error generated")
			// alert(errorMessage)
		});
	}).then((pastInfo5) => {
		nowTime -= 86400
		var nowDateLocal = new Date(nowTime * 1000)
		var pastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${globalCoordinates.lat}&lon=${globalCoordinates.lng}&dt=${nowTime}&appid=${weaThrottle}&units=metric`;
		// console.log("Past 4 url = ", pastUrl)
		var fetchPromisePast = fetch(pastUrl);
		fetchPromisePast.then(response => {
			return response.json();
		}).then(data => {
			// console.log("Past 5 data = ", data)
			info[-5] = storeInfo(data.hourly[pastHour].temp, data.hourly[pastHour].humidity, data.hourly[pastHour].wind_speed, data.hourly[pastHour].weather[0].main, data.hourly[pastHour].weather[0].description, data.hourly[pastHour].weather[0].icon, nowDateLocal)
			reflectBatchContainer(batchCellsPast, -5, 0)
			// console.log("Past 5 info = ", info["-5"])
		}).catch((errorMessage) => {
			// console.log("Past 5 error generated")
			// alert(errorMessage)
		});
	}).catch((errorMessage) => {
		alert(errorMessage)
	}).finally(() => {
		currentCoordinatesCalculating = false
	})
}

// calculateOnceComplete = (func) => {
// 	var counter = 0
// 	var runAfter = setInterval(() => {
// 		let sizeOfInfo = Object.keys(info).length;
// 		if (sizeOfInfo == 13 || counter == 99) {
// 			clearInterval(runAfter)
// console.log("Size of Info = ", sizeOfInfo)
// 			func()
// 		}
// 		counter++
// 	}, 100)
// }

function error(err) {
	console.log(`Warning(${err.code}): ${err.message}`);
	textField.value = "New Delhi, Delhi, India"
	getWeatherInfo()
}

setCurrentCoordinates = (location) => {
	currentCoordinates["lat"] = location.coords.latitude
	currentCoordinates["lng"] = location.coords.longitude
	currentCoordinatesCalculating = true
	textField.value = "My Location"
	getWeatherInfo()
}

handlePermission = () => {
	navigator.permissions.query({
		name: 'geolocation'
	}).then(function (result) {
		if (result.state == 'granted') {
			// console.log(result.state);
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(setCurrentCoordinates, error);
			} else
				alert("Geolocation is not supported by this browser. Couldn't get your location.");
		} else if (result.state == 'prompt') {
			// console.log(result.state);
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(setCurrentCoordinates, error);
			} else
				alert("Geolocation is not supported by this browser. Couldn't get your location.");
		} else if (result.state == 'denied') {
			alert("Please allow location permission from the browser settings!")
		}
		result.onchange = () => {
			// console.log(result.state);
		}
	});
}

showHideHeader = () => {
	var currentScrollTop = container.scrollTop
	if (currentScrollTop > lastScrollTop && currentScrollTop > headerHeight / 4) {
		navbar.style.transform = "translateY(-100%)"
	} else {
		navbar.style.transform = "translateY(0)"
	}
	lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop
}

container.addEventListener("scroll", showHideHeader)

hideScrollbar = () => {
	let offsetWidth = document.querySelector("#scroll-container").offsetWidth
	let clientWidth = document.querySelector("#scroll-container").clientWidth
	document.documentElement.style.setProperty("--scrollbarWidth", `${offsetWidth - clientWidth + 10}px`)
}

orientContent = () => {
	headerHeight = document.querySelector(".navbar").offsetHeight
	container = document.querySelector("#scroll-container")
	container.style.paddingTop = `${headerHeight}px`
}

window.addEventListener("resize", () => {
	hideScrollbar()
	orientContent()
})

window.onload = () => {
	hideScrollbar()
	orientContent()
	handlePermission();
}