import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, MapPin, Calendar, Heart, X } from "lucide-react";

const TASTE_DATA = {
  nature: {
    label: "자연",
    icon: "🌲",
    subs: ["바다", "산", "계곡", "자연휴양림", "생태관광", "자연공원"],
  },
  history: {
    label: "역사",
    icon: "🛕",
    subs: ["종교성지", "역사유적지", "문화재"],
  },
  culture: {
    label: "문화",
    icon: "🏛️",
    subs: ["관광단지", "전시시설", "문화공원", "자연명소"],
  },
  activity: {
    label: "체험",
    icon: "🏄",
    subs: ["레저", "웰니스", "생태", "동물원", "만들기"],
  },
};

// 1. 선호 스타일 피커 (투명 모자이크 백드롭 + 화살표 배제)
export const MultiTastePicker = ({ selectedSubs = [], onSubToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMains, setSelectedMains] = useState([]);

  const toggleMain = (mainKey) => {
    if (selectedMains.includes(mainKey)) {
      setSelectedMains(selectedMains.filter((k) => k !== mainKey));
      TASTE_DATA[mainKey].subs.forEach((sub) => {
        if (selectedSubs.includes(sub)) onSubToggle(sub);
      });
    } else {
      setSelectedMains([...selectedMains, mainKey]);
    }
  };

  const availableSubs = useMemo(() => {
    let list = [];
    selectedMains.forEach((mainKey) => {
      if (TASTE_DATA[mainKey]) list = [...list, ...TASTE_DATA[mainKey].subs];
    });
    return Array.from(new Set(list));
  }, [selectedMains]);

  const displayValue = useMemo(() => {
    if (selectedSubs.length === 0) return "취향을 선택해주세요";
    if (selectedSubs.length <= 2) return selectedSubs.join(", ");
    return `${selectedSubs[0]}, ${selectedSubs[1]} 외 ${selectedSubs.length - 2}개`;
  }, [selectedSubs]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      <div
        className="input-field !py-4 !px-6 transition-all cursor-pointer"
        onClick={() => setIsOpen(true)}>
        <div className="text-[12px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
          선호 스타일
        </div>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[17px] text-[#2D2A4A] sb-font-h truncate max-w-[85%] font-black">
            {selectedSubs.length > 0 ? (
              <span className="text-[#6B5FD8]">{displayValue}</span>
            ) : (
              displayValue
            )}
          </span>
          <div className="flex items-center text-[#6B5FD8] shrink-0">
            <Heart
              size={20}
              fill={selectedSubs.length > 0 ? "currentColor" : "none"}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/10 backdrop-blur-[6px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-[480px] bg-white/95 backdrop-blur-md rounded-[32px] shadow-[0_30px_100px_rgba(45,42,74,0.2)] border border-white p-6 flex flex-col max-h-[82vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <div>
                <h3 className="text-xl sb-font-h text-[#2D2A4A] flex items-center gap-2 font-black">
                  <Heart size={18} fill="#6B5FD8" className="text-[#6B5FD8]" />{" "}
                  맞춤 취향 설계
                </h3>
                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                  원하는 여행 테마를 모두 골라보세요
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 border border-gray-100 shadow-sm">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 pr-1 pb-2 flex-grow scrollbar-thin">
              <div>
                <div className="text-[11px] sb-font-h text-[#8884A8] uppercase tracking-wider mb-2 font-black">
                  1. 대분류 테마 선택
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(TASTE_DATA).map((key) => {
                    const item = TASTE_DATA[key];
                    const isSelected = selectedMains.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleMain(key)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs sb-font-h transition-all gap-1 font-black ${
                          isSelected
                            ? "bg-[#6B5FD8] text-white border-[#6B5FD8] shadow-md shadow-[#6B5FD8]/25"
                            : "bg-gray-50 text-[#2D2A4A] border-transparent hover:bg-[#F0EFFF] hover:text-[#6B5FD8]"
                        }`}>
                        <span className="text-xl mb-0.5">{item.icon}</span>
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] sb-font-h text-[#8884A8] uppercase tracking-wider mb-2 font-black">
                  2. 세부 태그 설정
                </div>
                {selectedMains.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubs.map((sub) => {
                      const isSubSelected = selectedSubs.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => onSubToggle(sub)}
                          className={`px-3 py-1.5 rounded-xl text-xs sb-font-h border transition-all font-black ${
                            isSubSelected
                              ? "bg-[#2D2A4A] text-white border-[#2D2A4A] shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#6B5FD8] hover:text-[#6B5FD8]"
                          }`}>
                          # {sub}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-100 py-6 text-center text-xs text-gray-400 font-medium bg-gray-50/50">
                    위에서 대분류 테마를 먼저 선택하면
                    <br />
                    상세 취향 태그들이 생성됩니다.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full bg-[#6B5FD8] text-white py-3.5 rounded-xl sb-font-h text-sm font-black shadow-lg shadow-[#6B5FD8]/20 hover:bg-[#5A4EBF] transition-colors flex items-center justify-center">
                <span>선호 스타일 설정 완료 ({selectedSubs.length}개)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 2. 출발지 설정 피커 (OriginSearchPicker) - 화살표 배제
export const OriginSearchPicker = ({ value, onSelect, onSelectFullInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGetCurrentLocation = (e) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert("GPS 위치 정보를 지원하지 않습니다.");
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(lng, lat, (result, status) => {
            setIsLoadingLocation(false);
            if (status === window.kakao.maps.services.Status.OK) {
              const address = result[0].address.address_name;
              onSelect(address);
              if (onSelectFullInfo)
                onSelectFullInfo({ name: "현재 위치", address, lat, lng });
              setIsOpen(false);
            }
          });
        } else {
          setIsLoadingLocation(false);
          alert("카카오맵 로드 전입니다.");
        }
      },
      () => {
        setIsLoadingLocation(false);
        alert("GPS 수신 실패");
      },
    );
  };

  const handleSearchPlace = (e) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) setPlaces(data);
      });
    }
  };

  const handleSelectPlace = (place) => {
    const lat = Number(place.y);
    const lng = Number(place.x);
    const displayName = place.place_name;
    onSelect(displayName);
    if (onSelectFullInfo)
      onSelectFullInfo({
        name: displayName,
        address: place.address_name,
        lat,
        lng,
      });
    setIsOpen(false);
    setKeyword("");
    setPlaces([]);
  };

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <div
        className="input-field !py-4 !px-6 transition-all cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="text-[12px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
          출발지 설정
        </div>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[17px] text-[#2D2A4A] sb-font-h truncate max-w-[85%] font-black">
            {value}
          </span>
          <div className="text-[#6B5FD8] shrink-0">
            <MapPin size={20} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sb-dropdown p-4 w-full min-w-[300px] md:min-w-[340px] animate-in fade-in zoom-in duration-200 z-50">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLoadingLocation}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-[#F0EFFF] hover:bg-[#6B5FD8] text-[#6B5FD8] hover:text-white transition-all py-2.5 rounded-xl text-xs sb-font-h font-bold shadow-sm">
            <span>
              {isLoadingLocation ? "위치 측정 중..." : "현재 위치 사용하기"}
            </span>
          </button>
          <form
            onSubmit={handleSearchPlace}
            className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <input
              type="text"
              className="bg-transparent text-sm font-semibold text-[#2D2A4A] outline-none w-full"
              placeholder="장소나 주소 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </form>
          <div className="max-h-[180px] overflow-y-auto space-y-0.5 mt-2 scrollbar-thin">
            {places.map((place) => (
              <div
                key={place.id}
                className="p-2.5 hover:bg-[#F0EFFF]/60 rounded-xl cursor-pointer text-sm font-bold text-[#2D2A4A]"
                onClick={() => handleSelectPlace(place)}>
                {place.place_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 3. 캘린더 날짜 피커 (CalendarPicker) - 화살표 배제
export const CalendarPicker = ({ value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const emptyCells = useMemo(() => {
    if (!options || options.length === 0) return [];
    const daysMapping = ["일", "월", "화", "수", "목", "금", "토"];
    const match = options[0].match(/\((.*?)\)/);
    return Array.from({ length: daysMapping.indexOf(match ? match[1] : "") });
  }, [options]);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <div
        className="input-field !py-4 !px-6 transition-all cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="text-[12px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
          여행 날짜
        </div>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[17px] text-[#2D2A4A] sb-font-h whitespace-nowrap font-black">
            {value}
          </span>
          <div className="text-[#6B5FD8] shrink-0">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sb-dropdown w-full min-w-[300px] animate-in fade-in zoom-in duration-200 z-[9999] absolute top-[105%] left-0 right-0 bg-white shadow-2xl rounded-3xl p-4 border border-gray-100">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div
                key={d}
                className="text-[11px] font-black text-gray-400 mb-1">
                {d}
              </div>
            ))}
            {emptyCells.map((_, idx) => (
              <div key={`empty-${idx}`} className="h-9 w-9"></div>
            ))}
            {options.map((option, idx) => (
              <div
                key={idx}
                className={`h-9 w-9 flex items-center justify-center rounded-xl text-xs sb-font-h cursor-pointer font-black transition-all ${
                  value === option
                    ? "bg-[#6B5FD8] text-white shadow-md shadow-[#6B5FD8]/25"
                    : "text-[#2D2A4A] hover:bg-[#F0EFFF]"
                }`}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}>
                {option.split(". ")[2]?.split(" ")[0] || ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. 일반 드롭다운 선택 아이템 (SelectItem - 성별, 나이, 이동시간 용)
export const SelectItem = ({ label, value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const finalOptions = useMemo(() => {
    if (label === "나이") {
      return ["10대", "20대", "30대", "40대", "50대", "60대", "70대 이상"];
    }
    return options;
  }, [label, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <div
        className="input-field !py-4 !px-6 transition-all cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="text-[12px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
          {label}
        </div>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[17px] text-[#2D2A4A] sb-font-h whitespace-nowrap font-black">
            {value}
          </span>
          {/* 출발 시간과 디자인 완성도를 맞추기 위해 strokeWidth={2.5} 굵기 동기화 */}
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`text-[#6B5FD8] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {isOpen && (
        <div className="sb-dropdown animate-in fade-in zoom-in-95 duration-200 z-50">
          {finalOptions.map((option, idx) => (
            <div
              key={idx}
              className="sb-dropdown-item py-3 text-[15px] font-black"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}>
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// 5. ⏰ 출발 시간 피커 (DepartureTimePicker)
export const DepartureTimePicker = ({ value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <div
        className="input-field !py-4 !px-6 transition-all cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="text-[12px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
          출발 시간
        </div>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[17px] text-[#2D2A4A] sb-font-h whitespace-nowrap font-black">
            {value}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`text-[#6B5FD8] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="sb-dropdown animate-in fade-in zoom-in-95 duration-200 z-50 max-h-[220px] overflow-y-auto scrollbar-thin">
          {options.map((option, idx) => (
            <div
              key={idx}
              className="sb-dropdown-item py-3 text-[15px] font-black"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}>
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
