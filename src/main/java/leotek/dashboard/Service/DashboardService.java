package leotek.dashboard.Service;

import java.util.*;

public interface DashboardService {
    public HashMap MemberGet(HashMap params);
    public List GraphDataGet(HashMap params);
    public HashMap GraphPointGet(HashMap params);
    public List GetTodayList(HashMap params);
    public List GetWeekList(HashMap params);
}
